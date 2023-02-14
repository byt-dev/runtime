use aws_sdk_s3 as s3;
use deno_core::serde_json;
use lambda_http::{aws_lambda_events::apigw::{ApiGatewayProxyRequest, ApiGatewayProxyResponse}, Response, Body, IntoResponse, http::HeaderMap,  };
use lambda_runtime::{service_fn, Error, LambdaEvent};
use serde::{de, ser};
use std::io::Read;
use byt_runtime::myworker::execute_module;

#[tokio::main]
async fn main() -> Result<(), Error> {
    tracing_subscriber::fmt()
        .with_max_level(tracing::Level::INFO)
        // disabling time is handy because CloudWatch will add the ingestion time.
        .without_time()
        .init();

    let func = service_fn(my_handler);
    lambda_runtime::run(func).await?;
    Ok(())
}

pub(crate) async fn my_handler(event: LambdaEvent<ApiGatewayProxyRequest>) -> Result<ApiGatewayProxyResponse, lambda_runtime::Error>{
    // print the event
    tracing::info!("event: {:?}", event);

    let path = event.payload.path.unwrap();
    // remove leading slash and append .gz
    let path = path.trim_start_matches('/').to_string();
    let path = format!("{}.gz", path);

    // path basename without extension
    let path_obj = std::path::Path::new(&path);
    let filename = path_obj.file_stem().unwrap().to_str().unwrap().to_string();


    let request_id = event.context.request_id.clone();
    let sdk_config = aws_config::load_from_env().await;

    tracing::info!("path: {:?}", path);

    // get env BUCKET_NAME
    let bucket_name = std::env::var("BUCKET_NAME").unwrap();
    let client = s3::Client::new(&sdk_config);
    let s3_object = client
        .get_object()
        .bucket(bucket_name)
        .key(&path)
        .send()
        .await
        .unwrap();
    let body = s3_object.body.collect().await.unwrap().into_bytes();
    let mut string_body = String::new();
    flate2::read::GzDecoder::new(&body[..]).read_to_string(&mut string_body).unwrap();

    // write string into file to tmp directory
    let tmp_dir = std::env::temp_dir();
    let tmp_dir = tmp_dir.join(format!("byt/{}", request_id));
    // create directory if not exists
    std::fs::create_dir_all(&tmp_dir).unwrap();
    let tmp_file = tmp_dir.join(filename);
    std::fs::write(&tmp_file, string_body).unwrap();

    let main_module = deno_core::resolve_path(&tmp_file.to_string_lossy()).unwrap();
    let result = execute_module(main_module, sdk_config, Default::default())
        .await
        .unwrap();


    let body = serde_json::to_string(&result).unwrap();
    ;
    let response = ApiGatewayProxyResponse {
        status_code: 200,
        // json headers
        headers: {
            let mut h = HeaderMap::new();
            h.insert("Content-Type", "application/json".parse().unwrap());
            h
        },
        multi_value_headers: Default::default(),
        body: Some(body.into()),
        is_base64_encoded: None,
    };

    Ok(response)
}
