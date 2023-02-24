use aws_sdk_s3 as s3;
use deno_core::{serde_json::{Value}, url::Url, StringOrBuffer};
use lambda_http::{aws_lambda_events::apigw::{ApiGatewayProxyRequest, ApiGatewayProxyResponse}, http::HeaderMap, http::header::HeaderName, http::header::HeaderValue};
use lambda_runtime::{service_fn, Error, LambdaEvent};
use std::{io::Read, collections::HashMap, sync::Arc};
use byt_runtime::myworker::{execute_module, RequestEvent};
use std::str::FromStr;

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

    let request_id = event.context.request_id.clone();
    let sdk_config = aws_config::load_from_env().await;

    tracing::info!("path: {:?}", path);

    // get first part of path
    let path_parts: Vec<&str> = path.split('/').collect();
    let path_part = path_parts[0].to_string();
    let tenant = event.payload.request_context.domain_prefix.clone().unwrap_or_else(|| "".to_string());
    // get filename from path
    let file_name = path_part.split('.').collect::<Vec<&str>>()[0].to_string();
    // first path_parts and file_name to s3_path
    let s3_path = format!("{}/{}.gz", tenant, file_name);

    // get env BUCKET_NAME
    let bucket_name = std::env::var("BUCKET_NAME").unwrap();
    let client = s3::Client::new(&sdk_config);
    let s3_object = client
        .get_object()
        .bucket(bucket_name)
        .key(&s3_path)
        .send()
        .await
        .unwrap();
    let body = s3_object.body.collect().await.unwrap().into_bytes();
    let mut string_body = String::new();
    flate2::read::GzDecoder::new(&body[..]).read_to_string(&mut string_body).unwrap();

    let request_context = event.payload.request_context;
    let domain_name = request_context.domain_name.clone().unwrap_or_else(|| "".to_string());
    let url_path = request_context.path.clone().unwrap_or_else(|| "".to_string());
    let url = Url::parse(&format!("https://{}{}", domain_name, url_path)).unwrap();
    let method = request_context.http_method.as_str().to_string();
    // add query string to url
    let query_string = event.payload.query_string_parameters;
    let query_string = query_string
        .iter()
        .map(|(k, v)| format!("{}={}", k, v))
        .collect::<Vec<String>>()
        .join("&");
    let url = Url::parse(&format!("{}?{}", url, query_string)).unwrap();

    let headers = event.payload.headers;
    // headers to HashMap
    let headers: HashMap<String, Value> = headers
        .iter()
        .map(|(k, v)| (k.to_string(), Value::String(v.to_str().unwrap().to_string())))
        .collect();

    let body = event.payload.body;
    // body to StringOrBuffer
    let body: StringOrBuffer = match body {
        Some(body) => StringOrBuffer::String(body),
        None => StringOrBuffer::Buffer(vec![].into()),
    };

    let request_event: RequestEvent = RequestEvent {
        request_id,
        domain_name,
        path: url_path,
        body: Some(body),
        headers,
        method,
        url,
    };

    let result = execute_module(string_body, sdk_config, request_event, Default::default())
        .await
        .unwrap();

    let body = result.body.to_vec();
    let body = String::from_utf8(body).unwrap();
    let headers = result.headers;
    // headers to map
    let headers: HashMap<String, String> = headers
        .iter()
        .map(|(k, v)| (k.to_string(), v.as_str().unwrap().to_string()))
        .collect();
    let headers: HeaderMap = headers
        .iter()
        .map(|(k, v)| (HeaderName::from_str(k.as_str()).unwrap(), HeaderValue::from_str(v.as_str()).unwrap()))
        .collect();
    // ckeck if header contains X-Is-Base64
    let is_base64_encoded = headers.contains_key("x-is-base64");

    let response = ApiGatewayProxyResponse {
        status_code: 200,
        // json headers
        headers,
        multi_value_headers: Default::default(),
        body: Some(lambda_http::Body::Text(body)),
        is_base64_encoded: Some(is_base64_encoded),
    };

    Ok(response)
}

#[cfg(test)]
mod test {
    use lambda_http::{http::Method, aws_lambda_events::query_map::QueryMap};
    use lambda_runtime::Context;
    use super::*;

    // this gzips the file and uploads it to s3 as file_name.gz
    async fn upload_to_s3(file_name: &str, tenant: &str) {
        let js_path = std::path::Path::new(env!("CARGO_MANIFEST_DIR"))
            .join("fixtures")
            .join(file_name);

        let file_name = file_name.split('.').collect::<Vec<&str>>()[0].to_string();

        let sdk_config = aws_config::load_from_env().await;
        let client = s3::Client::new(&sdk_config);
        let bucket_name = std::env::var("BUCKET_NAME").unwrap();
        let key = format!("{}/{}.gz", tenant, file_name);
        let mut file = std::fs::File::open(&js_path).unwrap();
        let mut gz = flate2::write::GzEncoder::new(Vec::new(), flate2::Compression::default());
        std::io::copy(&mut file, &mut gz).unwrap();
        let gz = gz.finish().unwrap();
        let gz = aws_sdk_s3::types::ByteStream::from(gz);

        let put_object = client
            .put_object()
            .bucket(bucket_name)
            .key(key)
            .body(gz);
        put_object.send().await.unwrap();
    }

    #[tokio::test]
    async fn test_run_simple_file() -> () {
        std::env::set_var("BUCKET_NAME", "cloudspec-lambda-runtime-undefin-mybucketf68f3ff0-1ad53swbdopz7");

        upload_to_s3("hello.js", "aTenant").await;

        let request_context  = lambda_http::aws_lambda_events::apigw::ApiGatewayProxyRequestContext {
            domain_name: Some("localhost".to_string()),
            path: Some("/hello.js".to_string()),
            domain_prefix: Some("aTenant".to_string()),
            http_method: Method::GET,
            ..Default::default()
        };

        let lambda_event = LambdaEvent {
            context: Context::default(),
            payload: ApiGatewayProxyRequest {
                path: Some("/hello.js".to_string()),
                request_context,
                ..Default::default()
            },
        };

        let r = my_handler(lambda_event).await.unwrap();
        assert_eq!(r.status_code, 200);
        assert_eq!(r.body.unwrap(), lambda_http::Body::Text("{\"name\":\"Hello\",\"foo\":1,\"bar\":true,\"baz\":[1,2,\"three\"]}".to_string()));
        assert_eq!(r.headers.get("content-type").unwrap(), "foo/bar");
    }

    #[tokio::test]
    async fn test_pass_request_response() -> () {
        std::env::set_var("BUCKET_NAME", "cloudspec-lambda-runtime-undefin-mybucketf68f3ff0-1ad53swbdopz7");

        upload_to_s3("request-response.js", "aTenant").await;


        let request_context  = lambda_http::aws_lambda_events::apigw::ApiGatewayProxyRequestContext {
            domain_name: Some("localhost".to_string()),
            path: Some("/request-response.js".to_string()),
            http_method: Method::GET,
            domain_prefix: Some("aTenant".to_string()),
            ..Default::default()
        };

        let query_map = QueryMap::from_str("foo=bar&baz=qux").unwrap();

        let lambda_event = LambdaEvent {
            context: Context::default(),
            payload: ApiGatewayProxyRequest {
                path: Some("/request-response.js".to_string()),
                request_context,
                query_string_parameters: query_map,
                ..Default::default()
            },
        };

        let r = my_handler(lambda_event).await.unwrap();
        assert_eq!(r.status_code, 200);
        assert_eq!(r.is_base64_encoded, Some(false));
    }

    #[tokio::test]
    async fn test_pass_base64() -> () {
        std::env::set_var("BUCKET_NAME", "cloudspec-lambda-runtime-undefin-mybucketf68f3ff0-1ad53swbdopz7");

        upload_to_s3("base64.js", "aTenant").await;


        let request_context  = lambda_http::aws_lambda_events::apigw::ApiGatewayProxyRequestContext {
            domain_name: Some("localhost".to_string()),
            path: Some("/base64.js".to_string()),
            http_method: Method::GET,
            domain_prefix: Some("aTenant".to_string()),
            ..Default::default()
        };

        let query_map = QueryMap::from_str("foo=bar&baz=qux").unwrap();

        let lambda_event = LambdaEvent {
            context: Context::default(),
            payload: ApiGatewayProxyRequest {
                path: Some("/base64.js".to_string()),
                request_context,
                query_string_parameters: query_map,
                ..Default::default()
            },
        };

        let r = my_handler(lambda_event).await.unwrap();
        assert_eq!(r.status_code, 200);
        assert_eq!(r.is_base64_encoded, Some(true));
    }

    #[tokio::test]
    async fn test_routes_to_first_path_segment() -> () {
        std::env::set_var("BUCKET_NAME", "cloudspec-lambda-runtime-undefin-mybucketf68f3ff0-1ad53swbdopz7");

        upload_to_s3("base64.js", "aTenant").await;


        let request_context  = lambda_http::aws_lambda_events::apigw::ApiGatewayProxyRequestContext {
            domain_name: Some("localhost".to_string()),
            path: Some("/base64/second/third".to_string()),
            http_method: Method::GET,
            domain_prefix: Some("aTenant".to_string()),
            ..Default::default()
        };

        let query_map = QueryMap::from_str("foo=bar&baz=qux").unwrap();

        let lambda_event = LambdaEvent {
            context: Context::default(),
            payload: ApiGatewayProxyRequest {
                path: Some("/base64/second/third".to_string()),
                request_context,
                query_string_parameters: query_map,
                ..Default::default()
            },
        };

        let r = my_handler(lambda_event).await.unwrap();
        assert_eq!(r.status_code, 200);
        assert_eq!(r.is_base64_encoded, Some(true));
    }
}