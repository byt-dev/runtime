use crate::cognito_srp_auth::{auth, CognitoAuthInput};
use crate::config::MyConfig;
use crate::error::CognitoSrpAuthError;
use confy;

pub async fn login(username: &String) -> Result<(), CognitoSrpAuthError> {
    let app_name = "byt";
    let config_name = None;

    let config: MyConfig = confy::load(app_name, config_name).unwrap();
    let file = confy::get_configuration_file_path(app_name, config_name).unwrap();
    println!("Using config file: {}", file.display());

    let password = rpassword::prompt_password("Password: ").unwrap();

    let input = CognitoAuthInput {
        client_id: config.client_id.clone(),
        pool_id: config.pool_id.clone(),
        username: username.clone(),
        password,
        mfa: None,
        client_secret: None,
    };

    let res = auth(input).await?;
    let auth_res = res.unwrap();
    print!("{:?}", auth_res.refresh_token());

    let refresh_token = auth_res.refresh_token().unwrap();
    let id_token = auth_res.id_token().unwrap();
    let access_token = auth_res.access_token().unwrap();

    let cfg: MyConfig = MyConfig {
        client_id: config.client_id,
        pool_id: config.pool_id,
        refresh_token: Some(refresh_token.to_string()),
        id_token: Some(id_token.to_string()),
        access_token: Some(access_token.to_string()),
        username: Some(username.to_string()),
        ..config
    };

    confy::store(app_name, config_name, &cfg).unwrap();

    Ok(())
}