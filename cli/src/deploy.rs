use std::io::{Read, Write};
use byt_bundler::bundle::bundler;
use flate2::Compression;
use flate2::write::GzEncoder;
use std::fs::File;
use std::path::PathBuf;
use crate::config::MyConfig;
use confy;

pub async fn deploy(path: &String) -> Result<(), anyhow::Error> {
    let app_name = "byt";
    let config_name = None;

    let config: MyConfig = confy::load(app_name, config_name).unwrap();
    let file = confy::get_configuration_file_path(app_name, config_name).unwrap();
    println!("Using config file: {}", file.display());
    println!("Bundling file: {}", path);

    // measure time
    let start = std::time::Instant::now();
    let code = bundler(path.to_string()).await.unwrap();
    let duration = start.elapsed();
    println!("Bundling took: {:?}", duration);

    let start = std::time::Instant::now();
    print!("Uploading...");

    // gzip contents
    let mut e = GzEncoder::new(Vec::new(), Compression::default());
    e.write_all(code.as_bytes())?;

    let url = format!("{endpoint}/{filename}.gz", endpoint = config.endpoint, filename = PathBuf::from(path).file_stem().unwrap().to_str().unwrap());

    // PUT to https://upload.run.byt.dev/yeah.gz
    let client = reqwest::Client::new();
    let res = client
        .put(url)
        .bearer_auth(config.access_token.unwrap())
        .body(e.finish()?)
        .send()
        .await;

    let duration = start.elapsed();
    println!(" {:?}", duration);

    // if error, print error
    if res.is_err() {
        println!("{:?}", res.unwrap_err());
        return Ok(());
    }

    let response = res.unwrap();

    // check for success status code
    if response.status().is_success() {
        println!("Success!");
    } else {
        println!("Error: {}", response.status());
        return Ok(());
    }

    let body = response.text().await.unwrap();

    // pretty print body as json
    let v: serde_json::Value = serde_json::from_str(&body).unwrap();
    println!("{}", serde_json::to_string_pretty(&v).unwrap());

    Ok(())

}
