use std::path::Path;
use lambda_http::{run, service_fn, Body, Error, Request, Response};
use byt_runtime::myworker::execute_module;


/// This is the main body for the function.
/// Write your code inside it.
/// There are some code examples in the Runtime repository:
/// - https://github.com/awslabs/aws-lambda-rust-runtime/tree/main/examples
async fn function_handler(_event: Request) -> Result<Response<Body>, Error> {
// Extract some useful information from the request
    let sdk_config = aws_config::load_from_env().await;
    let js_path = Path::new(env!("CARGO_MANIFEST_DIR"))
        .join("examples")
        .join("hello.js");
    let main_module = deno_core::resolve_path(&js_path.to_string_lossy()).unwrap();
    execute_module(main_module, sdk_config, Default::default()).await?;

    // Return something that implements IntoResponse.
    // It will be serialized to the right response event automatically by the runtime
    let resp = Response::builder()
        .status(200)
        .header("content-type", "text/html")
        .body("Hello AWS Lambda HTTP request".into())
        .map_err(Box::new)?;
    Ok(resp)
}

#[tokio::main]
async fn main() -> Result<(), Error> {
    tracing_subscriber::fmt()
        .with_max_level(tracing::Level::INFO)
        // disabling time is handy because CloudWatch will add the ingestion time.
        .without_time()
        .init();

    run(service_fn(function_handler)).await
}