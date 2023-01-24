use aws_sdk_s3 as s3;
use deno_core::serde_json;
use lambda_runtime::{service_fn, Error, LambdaEvent};
use serde::{Deserialize, Serialize};

/// This is also a made-up example. Requests come into the runtime as unicode
/// strings in json format, which can map to any structure that implements `serde::Deserialize`
/// The runtime pays no attention to the contents of the request payload.
#[derive(Deserialize)]
struct Request {
    key: String,
}

/// This is a made-up example of what a response structure may look like.
/// There is no restriction on what it can be. The runtime requires responses
/// to be serialized into json. The runtime pays no attention
/// to the contents of the response payload.
#[derive(Serialize)]
struct Response {
    req_id: String,
    msg: String,
    payload: serde_json::Value,
}

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

pub(crate) async fn my_handler(event: LambdaEvent<Request>) -> Result<Response, Error> {
    // extract some useful info from the request
    let key = event.payload.key;
    let request_id = event.context.request_id.clone();

    let sdk_config = aws_config::load_from_env().await;

    // get env BUCKET_NAME
    let bucket_name = std::env::var("BUCKET_NAME").unwrap();

    let client = s3::Client::new(&sdk_config);
    let s3_object = client
        .get_object()
        .bucket(bucket_name)
        .key(&key)
        .send()
        .await
        .unwrap();
    let body = s3_object.body.collect().await.unwrap();

    // write string into file to tmp directory
    let tmp_dir = std::env::temp_dir();
    let tmp_dir = tmp_dir.join(format!("byt/{}", request_id));
    // create directory if not exists
    std::fs::create_dir_all(&tmp_dir).unwrap();
    let tmp_file = tmp_dir.join("index.js");
    std::fs::write(&tmp_file, body.into_bytes()).unwrap();

    let main_module = deno_core::resolve_path(&tmp_file.to_string_lossy()).unwrap();
    let result = execute_module(main_module, sdk_config, Default::default())
        .await
        .unwrap();

    // prepare the response
    let resp = Response {
        req_id: event.context.request_id,
        msg: format!("Command {:?} executed.", key),
        payload: result,
    };

    // return `Response` (it will be serialized to JSON automatically by the runtime)
    Ok(resp)
}
