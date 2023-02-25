use std::io::{Read, Write};
use byt_bundler::bundle::bundler;
use flate2::Compression;
use flate2::write::GzEncoder;
use std::fs::File;
use std::path::PathBuf;
use crate::config::MyConfig;
use confy;

pub async fn deploy(path: &String, skip: bool) -> Result<(), anyhow::Error> {
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

    let id_token = config.id_token.unwrap();

    // PUT to https://upload.run.byt.dev/yeah.gz
    let client = reqwest::Client::new();
    let res = client
        .put(url)
        .bearer_auth(&id_token)
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

    if !skip && PathBuf::from(path).parent().unwrap().join("static").exists() {
        // if "static" folder exists in path directory, copy the files recursively to the server
        let static_path = PathBuf::from(path).parent().unwrap().join("static");
        for entry in std::fs::read_dir(&static_path)? {
            let entry = entry?;
            let path = entry.path();
            if path.to_str().unwrap().contains(".DS_Store") {
                continue;
            }
            if path.is_file() {
                // file name relative to static folder
                let file_name = path.strip_prefix(PathBuf::from(&static_path).parent().unwrap()).unwrap().to_str().unwrap();
                println!("Uploading file: {}", file_name);
                // append gz extension
                let file_name = format!("{}.gz", file_name);
                let url = format!("{endpoint}/{filename}", endpoint = config.endpoint, filename = file_name);
                let mut file = File::open(&path)?;

                let mut contents = Vec::new();
                file.read_to_end(&mut contents)?;

                // gzip contents
                let mut e = GzEncoder::new(Vec::new(), Compression::default());
                e.write_all(&mut contents)?;
                let contents = e.finish()?;
                let client = reqwest::Client::new();

                // mime type of file
                let mime = mime_guess::from_path(&path).first_or_octet_stream();

                let res = client
                    .put(url)
                    .bearer_auth(&id_token)
                    .body(contents)
                    .header("Content-Type", mime.to_string())
                    .header("Content-Encoding", "gzip")
                    .send()
                    .await;
                if res.is_err() {
                    println!("{:?}", res.unwrap_err());
                    return Ok(());
                }
                let response = res.unwrap();
                if response.status().is_success() {
                    println!("Success!");
                } else {
                    println!("Error: {}", response.status());
                    return Ok(());
                }
            }
        }
    }

    // pretty print body as json
    let v: serde_json::Value = serde_json::from_str(&body).unwrap();
    println!("{}", serde_json::to_string_pretty(&v).unwrap());

    Ok(())

}
