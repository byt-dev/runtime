use deno_core::OpState;
use deno_core::error::AnyError;
use deno_core::op;
use deno_core::Extension;
use deno_core::FsModuleLoader;
use deno_runtime::deno_broadcast_channel::InMemoryBroadcastChannel;
use deno_runtime::deno_web::BlobStore;
use deno_runtime::permissions::Permissions;
use deno_runtime::worker::MainWorker;
use deno_runtime::worker::WorkerOptions;
use deno_runtime::BootstrapOptions;
use std::cell::RefCell;
use std::path::Path;
use std::rc::Rc;
use std::sync::Arc;
use aws_sdk_s3 as s3;

fn get_error_class_name(e: &AnyError) -> &'static str {
    deno_runtime::errors::get_error_class_name(e).unwrap_or("Error")
}

#[op]
fn op_hello_world() -> Result<(), AnyError> {
    println!("Hello World of Ops");
    Ok(())
}

#[op]
fn op_hello_reverse(input: String) -> Result<String, AnyError> {
    println!("Hello World of Reverse");
    Ok(input.chars().rev().collect())
}

#[op]
async fn op_aws_s3_list_buckets_async(state: Rc<RefCell<OpState>>) -> Result<Vec<String>, AnyError> {
    let client = {
        // state needs to be dropped before client is used. Otherwise, the mutable borrow in deno_ffi will fail.
        // e.g. "thread 'main' panicked at 'already borrowed: BorrowMutError'"
        let opstate_ = state.borrow();
        let config = opstate_.borrow::<aws_config::SdkConfig>();
        let client = s3::Client::new(config);
        client
    };
    let resp = client.list_buckets().send().await?;
    let result = resp.buckets.unwrap().iter().map(|b| b.name.clone().unwrap()).collect::<Vec<String>>();
    Ok(result)
}

#[tokio::main]
async fn main() -> Result<(), AnyError> {
    let module_loader = Rc::new(FsModuleLoader);
    let create_web_worker_cb = Arc::new(|_| {
        todo!("Web workers are not supported in the example");
    });
    let web_worker_event_cb = Arc::new(|_| {
        todo!("Web workers are not supported in the example");
    });

    let config = aws_config::load_from_env().await;

    let runjs_extension = Extension::builder()
        .ops(vec![op_hello_world::decl(), op_hello_reverse::decl(), op_aws_s3_list_buckets_async::decl()])
        .state(move |state| {
          state.put::<aws_config::SdkConfig>(config.clone());
          Ok(())
         })
        .build();

    println!("ARGC: {}", op_hello_reverse::decl().argc);

    let options = WorkerOptions {
        bootstrap: BootstrapOptions {
            args: vec![],
            cpu_count: 1,
            debug_flag: false,
            enable_testing_features: false,
            locale: deno_core::v8::icu::get_language_tag(),
            location: None,
            no_color: false,
            is_tty: false,
            runtime_version: "x".to_string(),
            ts_version: "x".to_string(),
            unstable: false,
            user_agent: "hello_runtime".to_string(),
            inspect: false,
        },
        extensions: vec![runjs_extension],
        extensions_with_js: vec![],
        startup_snapshot: None,
        unsafely_ignore_certificate_errors: None,
        root_cert_store: None,
        seed: None,
        source_map_getter: None,
        format_js_error_fn: None,
        web_worker_preload_module_cb: web_worker_event_cb.clone(),
        web_worker_pre_execute_module_cb: web_worker_event_cb,
        create_web_worker_cb,
        maybe_inspector_server: None,
        should_break_on_first_statement: false,
        should_wait_for_inspector_session: false,
        module_loader,
        npm_resolver: None,
        get_error_class_fn: Some(&get_error_class_name),
        cache_storage_dir: None,
        origin_storage_dir: None,
        blob_store: BlobStore::default(),
        broadcast_channel: InMemoryBroadcastChannel::default(),
        shared_array_buffer_store: None,
        compiled_wasm_module_store: None,
        stdio: Default::default(),
    };

    let js_path = Path::new(env!("CARGO_MANIFEST_DIR"))
        .join("src")
        .join("hello.js");
    let main_module = deno_core::resolve_path(&js_path.to_string_lossy())?;
    let permissions = Permissions::allow_all();

    let mut worker = MainWorker::bootstrap_from_options(main_module.clone(), permissions, options);
    const RUNTIME_JAVASCRIPT_CORE: &str = include_str!("./runtime.js");
    worker.execute_script("[runjs:runtime.js]", RUNTIME_JAVASCRIPT_CORE)?;
    worker.execute_main_module(&main_module).await?;
    worker.run_event_loop(false).await?;
    Ok(())
}

#[cfg(test)]
mod test {
    use super::*;

    #[test]
    fn test_op_reverse_string() {
        let result = op_hello_reverse::call("Hello".into()).unwrap();
        assert_eq!(result, "olleH");
    }
}
