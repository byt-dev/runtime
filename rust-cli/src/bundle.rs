use anyhow::Error;
use deno_cli::tools::bundle::bundle;
use deno_cli::args::Flags;
use deno_cli::args::BundleFlags;
use std::path::PathBuf;

pub async fn bundler(
  root: String,
) -> Result<(), Error> {

  let flags = Flags {
    ..Default::default()
  };

  let path_buf = PathBuf::from("/tmp/out.js");

  let bundle_flags = BundleFlags {
    source_file: root.clone(),
    out_file: Some(path_buf),
  };

  bundle(flags, bundle_flags).await.unwrap();
  Ok(())
}

#[cfg(test)]
mod test {
    use super::*;

    #[tokio::test]
    async fn test_bundle() {
        let result = bundler("examples/hello.js".to_string()).await.unwrap();
        assert_eq!(result, ());
    }
}
