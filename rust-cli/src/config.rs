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
        endpoint: "https://dtud5p8n9d6d9.cloudfront.net".to_string(),
        client_id: "5aqpao8s28iejps5m8l0uqa7mr".to_string(),
        pool_id: "us-east-1_je8HYhUZT".to_string(),
        username: None,
        access_token: None,
        refresh_token: None,
        id_token: None,
    } }
}

