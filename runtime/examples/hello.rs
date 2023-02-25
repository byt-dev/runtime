use std::{path::Path, collections::HashMap, str::FromStr};
use byt_runtime::myworker::{execute_module, RequestEvent};
use deno_core::{error::AnyError, url::Url};

#[tokio::main]
async fn main() -> Result<(), AnyError> {
    let url = Url::from_str("http://localhost/request-response ").unwrap();

    let lambda_event = RequestEvent {
        method: "GET".to_string(),
        request_id: "123".to_string(),
        path: url.path().to_string(),
        domain_name: url.host_str().unwrap().to_string(),
        body: None,
        headers: HashMap::new(),
        url,
        tenant: "tenant".to_string(),
    };

    let sdk_config = aws_config::load_from_env().await;
    let js_path = Path::new(env!("CARGO_MANIFEST_DIR"))
        .join("examples")
        .join("hello.js");
    let code = std::fs::read_to_string(js_path).unwrap();
    execute_module(code, sdk_config, lambda_event, Default::default()).await.unwrap();
    Ok(())
}