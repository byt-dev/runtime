use aws_sdk_s3 as s3;
use deno_core::error::AnyError;
use deno_core::op;
use deno_core::serde::Deserialize;
use deno_core::serde_json;
use deno_core::serde_json::Map;
use deno_core::serde_json::Value;
use deno_core::Extension;
use deno_core::FsModuleLoader;
use deno_core::ModuleSpecifier;
use deno_core::OpState;
use deno_core::serde_v8;
use deno_core::v8;
use deno_runtime::deno_broadcast_channel::InMemoryBroadcastChannel;
use deno_runtime::deno_web::BlobStore;
use deno_runtime::ops::io::Stdio;
use deno_runtime::permissions::Permissions;
use deno_runtime::permissions::PermissionsContainer;
use deno_runtime::worker::MainWorker;
use deno_runtime::worker::WorkerOptions;
use deno_runtime::BootstrapOptions;
use std::cell::RefCell;
use std::rc::Rc;
use std::sync::Arc;

fn get_error_class_name(e: &AnyError) -> &'static str {
    deno_runtime::errors::get_error_class_name(e).unwrap_or("Error")
}

#[derive(Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct ExtensionPlanArgs {
    id: String,
    extension_type: String,
    // filter is a string indexed object with arbitrary keys and values.
    filter: Map<String, Value>,
    callback: String,
}

#[op]
fn op_extension_plan(
    _state: &mut OpState,
    extension_plan: ExtensionPlanArgs,
) -> Result<(), AnyError> {
    // print extension plan
    extension_plan.filter.iter().for_each(|(k, v)| {
        println!("{}: {}", k, v);
    });
    println!("Extension Plan: {:?}", extension_plan);
    Ok(())
}

#[op]
fn op_execution_mode(_state: &mut OpState) -> Result<String, AnyError> {
    // print extension plan
    Ok("exec".to_string())
}

#[op]
fn op_extension_payload(
    _state: &mut OpState,
    id: String,
) -> Result<Vec<Map<String, Value>>, AnyError> {
    // return extension payload
    let mut payload = Map::new();
    let mut context = Map::new();
    payload.insert("payload".to_string(), Value::String(id));
    context.insert("context".to_string(), Value::String('x'.to_string()));
    Ok(vec![payload, context])
}

#[op]
fn op_hello_reverse(input: String) -> Result<String, AnyError> {
    println!("Hello, {}!", input);
    Ok(input.chars().rev().collect())
}

#[op]
async fn op_aws_s3_list_buckets_async(
    state: Rc<RefCell<OpState>>,
) -> Result<Vec<String>, AnyError> {
    let client = {
        // state needs to be dropped before client is used. Otherwise, the mutable borrow in deno_ffi will fail.
        // e.g. "thread 'main' panicked at 'already borrowed: BorrowMutError'"
        let opstate_ = state.borrow();
        let config = opstate_.borrow::<aws_config::SdkConfig>();
        let client = s3::Client::new(config);
        client
    };
    let resp = client.list_buckets().send().await?;
    let result = resp
        .buckets
        .unwrap()
        .iter()
        .map(|b| b.name.clone().unwrap())
        .collect::<Vec<String>>();
    Ok(result)
}

/// This worker is created and used by almost all
/// subcommands in Deno executable.
///
/// It provides ops available in the `Deno` namespace.
///
/// All `WebWorker`s created during program execution
/// are descendants of this worker.

pub async fn execute_module(
    main_module: ModuleSpecifier,
    sdk_config: aws_config::SdkConfig,
    stdio: Stdio,
) -> Result<deno_core::serde_json::Value, AnyError> {
    let module_loader = Rc::new(FsModuleLoader);
    let create_web_worker_cb = Arc::new(|_| {
        todo!("Web workers are not supported in the example");
    });
    let web_worker_event_cb = Arc::new(|_| {
        todo!("Web workers are not supported in the example");
    });

    let runjs_extension = Extension::builder("byt")
        .ops(vec![
            op_extension_plan::decl(),
            op_aws_s3_list_buckets_async::decl(),
            op_execution_mode::decl(),
            op_extension_payload::decl(),
            op_hello_reverse::decl(),
        ])
        .state(move |state| {
            state.put::<aws_config::SdkConfig>(sdk_config.clone());
            Ok(())
        })
        .build();

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
        stdio,
    };

    let permissions = PermissionsContainer::allow_all();
    let mut worker = MainWorker::bootstrap_from_options(main_module.clone(), permissions, options);

    const RUNTIME_JAVASCRIPT_CORE: &str = include_str!("./runtime.js");
    worker
        .execute_script("[runjs:runtime.js]", RUNTIME_JAVASCRIPT_CORE)
        .unwrap();

    println!("main worker");
    let module_id = worker.preload_main_module(&main_module).await.unwrap();
    let result = worker.evaluate_module(module_id).await;
    let module_namespace = worker.js_runtime.get_module_namespace(module_id).unwrap();
    let scope = &mut worker.js_runtime.handle_scope();
    let module_namespace = v8::Local::<v8::Object>::new(scope, module_namespace);

    let default_export_name = v8::String::new(scope, "default").unwrap();
    let binding = module_namespace.get(scope, default_export_name.into());

    // log the result of the binding
    let binding = binding.unwrap();
    // let binding = binding.to_object(scope).unwrap();

    // deserialize the binding as struct
    let binding: serde_json::Value = serde_v8::from_v8(scope, binding).unwrap();
    println!("binding: {:#?}", binding);

    Ok(binding)
}

#[cfg(test)]
mod test {
    use std::path::Path;

    use super::*;

    #[test]
    fn test_op_reverse_string() {
        let result = op_hello_reverse::call("Hello".into()).unwrap();
        assert_eq!(result, "olleH");
    }

    #[tokio::test]
    async fn test_runtime() {
        let sdk_config = aws_config::load_from_env().await;
        let js_path = Path::new(env!("CARGO_MANIFEST_DIR"))
            .join("examples")
            .join("hello.js");
        let main_module = deno_core::resolve_path(&js_path.to_string_lossy()).unwrap();

        let result = execute_module(main_module, sdk_config, Default::default())
            .await
            .unwrap();
        assert_eq!(result.get("name").unwrap(), "Hello");
    }

    #[tokio::test]
    async fn test_runtime_request_handler() {
        let sdk_config = aws_config::load_from_env().await;
        let js_path = Path::new(env!("CARGO_MANIFEST_DIR"))
            .join("examples")
            .join("request")
            .join("wrapper.js");
        let main_module = deno_core::resolve_path(&js_path.to_string_lossy()).unwrap();

        let result = execute_module(main_module, sdk_config, Default::default())
            .await
            .unwrap();
        print!("{:#?}", result);
        assert_eq!(result.get("statusCode").unwrap(), 200);
    }
}
