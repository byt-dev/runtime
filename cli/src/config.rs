use serde::{Serialize, Deserialize};

#[derive(Serialize, Deserialize)]
pub struct MyConfig {
    pub version: u8,
    pub client_id: String,
    pub pool_id: String,
    pub username: Option<String>,
    pub access_token: Option<String>,
    pub refresh_token: Option<String>,
    pub id_token: Option<String>,
    pub endpoint: String
}

/// `MyConfig` implements `Default`
impl ::std::default::Default for MyConfig {
    fn default() -> Self { Self {
        version: 0,
        endpoint: "https://d18d93how53tnh.cloudfront.net".to_string(),
        client_id: "52i95vdo375c8vdb91pb439qrg".to_string(),
        pool_id: "us-east-1_GmfCLaT55".to_string(),
        username: None,
        access_token: None,
        refresh_token: None,
        id_token: None,
    } }
}

