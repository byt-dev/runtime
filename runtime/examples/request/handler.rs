use std::path::Path;
use byt_runtime::myworker::execute_module;
use deno_core::error::AnyError;

#[tokio::main]
async fn main() -> Result<(), AnyError> {
    let sdk_config = aws_config::load_from_env().await;
    let js_path = Path::new(env!("CARGO_MANIFEST_DIR"))
        .join("examples")
        .join("request")
        .join("wrapper.js");
    let main_module = deno_core::resolve_path(&js_path.to_string_lossy()).unwrap();

    execute_module(main_module, sdk_config, Default::default()).await.unwrap();
    Ok(())
}