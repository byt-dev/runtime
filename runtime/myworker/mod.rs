use aws_sdk_s3 as s3;
use deno_core::ByteString;
use deno_core::StringOrBuffer;
use deno_core::ZeroCopyBuf;
use deno_core::error::AnyError;
use deno_core::op;
use deno_core::serde::Deserialize;
use deno_core::serde_json::Map;
use deno_core::serde_json::Value;
use deno_core::Extension;
use deno_core::FsModuleLoader;
use deno_core::OpState;
use deno_core::url::Url;
use deno_core::v8;
use deno_runtime::deno_broadcast_channel::InMemoryBroadcastChannel;
use deno_runtime::deno_web::BlobStore;
use deno_runtime::ops::io::Stdio;
use deno_runtime::permissions::PermissionsContainer;
use deno_runtime::worker::MainWorker;
use deno_runtime::worker::WorkerOptions;
use deno_runtime::BootstrapOptions;
use serde::Serialize;
use std::cell::RefCell;
use std::collections::HashMap;
use std::io::Read;
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
async fn op_byt_files_get_async(
    state: Rc<RefCell<OpState>>,
    path: String,
) -> Result<Box<[u8]>, AnyError> {
    let client = {
        // state needs to be dropped before client is used. Otherwise, the mutable borrow in deno_ffi will fail.
        // e.g. "thread 'main' panicked at 'already borrowed: BorrowMutError'"
        let opstate_ = state.borrow();
        let config = opstate_.borrow::<aws_config::SdkConfig>();
        let client = s3::Client::new(config);
        client
    };
    let byt_op_config: BytOpConfig = {
        let op_state_ = state.borrow();
        let byt_op_config = op_state_.borrow::<BytOpConfig>();
        byt_op_config.clone()
    };

    let key = format!("{}/static/{}.gz", byt_op_config.tenant, path);
    println!("key: {}", key);
    println!("bucket: {}", byt_op_config.bucket);

    let resp = client.get_object().bucket(byt_op_config.bucket).key(key).send().await?;
    let result = resp
        .body;

    // result to Box<[u8]>
    let result = result.collect().await?;
    let result = result.to_vec();
    // ungzip
    let result = flate2::read::GzDecoder::new(result.as_slice());
    let result = result.bytes().collect::<Result<Vec<u8>, _>>()?;
    let result = result.into_boxed_slice();

    Ok(result)
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Response {
    pub body: ZeroCopyBuf,
    pub headers: HashMap<String, Value>,
    pub status: u16,
    pub status_text: ByteString,
    pub url: ByteString,
    pub redirected: bool,
    pub ok: bool,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RequestEvent {
    pub method: String,
    pub request_id: String,
    pub path: String,
    pub domain_name: String,
    pub body: Option<StringOrBuffer>,
    pub headers: HashMap<String, Value>,
    pub url: Url,
    pub tenant: String,
}

#[derive(Debug, Serialize, Clone)]
pub struct BytOpConfig {
    pub bucket: String,
    pub tenant: String,
}

pub async fn execute_module(
    user_code: String,
    sdk_config: aws_config::SdkConfig,
    event: RequestEvent,
    stdio: Stdio,
) -> Result<Response, AnyError> {
    let module_loader = Rc::new(FsModuleLoader);
    let create_web_worker_cb = Arc::new(|_| {
        todo!("Web workers are not supported in the example");
    });
    let web_worker_event_cb = Arc::new(|_| {
        todo!("Web workers are not supported in the example");
    });

    let bucket_name = std::env::var("BUCKET_NAME").unwrap();

    let runjs_extension = Extension::builder("byt")
        .ops(vec![
            op_extension_plan::decl(),
            op_byt_files_get_async::decl(),
            op_execution_mode::decl(),
            op_extension_payload::decl(),
            op_hello_reverse::decl(),
        ])
        .state(move |state| {
            state.put::<aws_config::SdkConfig>(sdk_config.clone());
            state.put::<BytOpConfig>(BytOpConfig {
                bucket: bucket_name.clone(),
                tenant: event.tenant.clone(),
            });
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

    let main_module_specifier_url = Url::parse("file:///entrypoint.ts").unwrap();
    let side_module_specifier_url = Url::parse("file:///usercode.ts").unwrap();

    let permissions = PermissionsContainer::allow_all();
    let mut worker = MainWorker::bootstrap_from_options(main_module_specifier_url.clone(), permissions, options);

    const RUNTIME_JAVASCRIPT_CORE: &str = include_str!("./runtime.js");
    const ENTRYPOINT_JS: &str = include_str!("./entrypoint.js");

    worker
        .execute_script("[runjs:runtime.js]", RUNTIME_JAVASCRIPT_CORE)
        .unwrap();

    let mut js_runtime = worker.js_runtime;
    let _ = js_runtime.load_side_module(&side_module_specifier_url, Some(user_code)).await?;
    let mod_id = js_runtime.load_main_module(&main_module_specifier_url, Some(ENTRYPOINT_JS.to_string())).await?;
    let result = js_runtime.mod_evaluate(mod_id);
    js_runtime.run_event_loop(false).await?;

    let promise = {
        let namespace = js_runtime.get_module_namespace(mod_id)?;
        let scope = &mut js_runtime.handle_scope();

        let module_namespace = v8::Local::<v8::Object>::new(scope, namespace);
        let export_fn_name = v8::String::new(scope, "default").unwrap();
        let export_fn = module_namespace.get(scope, export_fn_name.into()).unwrap();

        let export_fn = v8::Local::<v8::Function>::try_from(export_fn).unwrap();
        let arg = v8::String::new(scope, &event.url.as_str()).unwrap();
        // make arg a v8::Value
        let arg = v8::Local::<v8::Value>::try_from(arg).unwrap();

        let called = export_fn.call(scope, module_namespace.into(), &[arg]).unwrap();
        let called = v8::Global::<v8::Value>::new(scope, called);

        called
    };

    let resolved: Result<Response, String> = {
        let resolved = js_runtime.resolve_value(promise).await?;
        let scope = &mut js_runtime.handle_scope();
        let resolved = v8::Local::<v8::Value>::new(scope, resolved);
        // handle error and debug
        let resolved = deno_core::serde_v8::from_v8::<Response>(scope, resolved);

        match resolved {
            Ok(value) => {
                println!("RESOLVED: {:?}", value);
                Ok(value)
            },
            Err(err) => Err(format!("Cannot deserialize value: {err:?}")),
        }
    };

    let result = result.await.unwrap();

    if let Err(err) = result {
        let err = err.to_string();
        println!("ERROR: {}", err);
    }

    let resolved = resolved.unwrap();
    Ok(resolved)
}

#[cfg(test)]
mod test {
    use std::collections::HashMap;
    use std::path::Path;
    use std::str::FromStr;
    use byt_bundler::bundle::bundler;
    use deno_core::serde_json;
    use std::fs::read_to_string;
    use super::*;

    #[test]
    fn test_op_reverse_string() {
        let result = op_hello_reverse::call("Hello".into()).unwrap();
        assert_eq!(result, "olleH");
    }

    #[tokio::test]
    async fn test_runtime() {
        let url = Url::from_str("http://localhost/hello").unwrap();

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

        let code = read_to_string(js_path).unwrap();
        let result = execute_module(code, sdk_config, lambda_event, Default::default())
            .await
            .unwrap();
        let body = serde_json::from_slice::<HashMap<String, Value>>(&result.body.to_vec()).unwrap();
        assert_eq!(result.status, 200);
        assert_eq!(body.get("name").unwrap(), "Hello");
        print!("{:?}", result.headers);
        assert_eq!(result.headers.get("content-type").unwrap(), "application/json");
    }

    #[tokio::test]
    async fn test_runtime_hono() {
        let url = Url::from_str("http://localhost/hello").unwrap();

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
            .join("hono")
            .join("index.js");
        let bundled = bundler(js_path.to_string_lossy().into_owned()).await.unwrap();
        let result = execute_module(bundled, sdk_config, lambda_event, Default::default())
            .await
            .unwrap();
        // Zero-copy conversion from bytes to string
        let body = String::from_utf8_lossy(&result.body);

        assert_eq!(result.status, 200);
        assert_eq!(body, "Hello Hono!");
    }
}
