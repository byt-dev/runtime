use anyhow::Error;
use deno_cli::args::ConfigFlag;
use deno_cli::args::TypeCheckMode;
use crate::bundle_inline::bundle;
use deno_cli::args::Flags;
use deno_cli::args::BundleFlags;


pub async fn bundler(
  root: String,
) -> Result<String, Error> {
  let flags = Flags {
    type_check_mode: TypeCheckMode::None,
    config_flag: ConfigFlag::Disabled,
    log_level: Some(log::Level::Warn),
    ..Default::default()
  };

  let bundle_flags = BundleFlags {
    source_file: root.clone(),
    out_file: None
  };

  let result = bundle(flags, bundle_flags).await.unwrap();
  Ok(result.code)
}

#[cfg(test)]
mod test {
    use std::path::Path;

    use super::*;

    #[tokio::test]
    async fn test_bundle() {
        // examples/hello.js as path which works on linux and windows
        let file_path = Path::new("examples")
            .join("hello.js")
            .to_string_lossy()
            .to_string();

        let result = bundler(file_path).await.unwrap();
        assert!(result.contains("Hello, world from JS!"));
    }
}
