use aws_config::default_provider::region;
use aws_config::meta::region::RegionProviderChain;
use aws_sdk_cognitoidentityprovider::Region;
use aws_sdk_cognitoidentityprovider::client::Client;
use crate::config::MyConfig;
use crate::error::CognitoSrpAuthError;
use confy;

pub async fn confirm(username: &String, code: &String) -> Result<(), CognitoSrpAuthError> {
    let app_name = "byt";
    let config_name = None;

    let config: MyConfig = confy::load(app_name, config_name).unwrap();
    let file = confy::get_configuration_file_path(app_name, config_name).unwrap();
    println!("Using config file: {}", file.display());

    // cognito client with 'us-east-1' region
    let region_provider = RegionProviderChain::first_try(region::default_provider())
        .or_default_provider()
        .or_else(Region::new("us-east-1"));
    let region = region_provider.region().await.unwrap();
    // sdk config with region
    let sdk_config = aws_config::from_env().region(region).load().await;
    // client with sdk config
    let client = Client::new(&sdk_config);

    let op = client.confirm_sign_up()
        .client_id(config.client_id)
        .username(username.to_string())
        .confirmation_code(code.to_string());

    let res = op.send().await;
    println!("{:?}", res);

    Ok(())
}