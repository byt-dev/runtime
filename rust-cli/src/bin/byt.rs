use clap::{arg, Command};
use byt_cli::login::login;
use byt_cli::signup::signup;
use byt_cli::deploy::deploy;

fn cli() -> Command {
    Command::new("byt")
        .about("A fictional versioning CLI")
        .subcommand_required(true)
        .arg_required_else_help(true)
        .allow_external_subcommands(true)
        .subcommand(
            Command::new("login")
                .about("Login to byt.dev")
                .arg(arg!(<USERNAME> "The username"))
                .arg_required_else_help(true),
        )
        .subcommand(
            Command::new("signup")
                .about("Signup to byt.dev")
                .arg(arg!(<USERNAME> "The username"))
                .arg(arg!(<EMAIL> "The email"))
                .arg_required_else_help(true),
        )
        .subcommand(
            Command::new("deploy")
                .about("Deploy a file to byt.dev")
                .arg(arg!(<PATH> "The file to deploy"))
        )
}

#[tokio::main]
async fn main() -> Result<(), anyhow::Error> {
    env_logger::init();
    let matches = cli().get_matches();

    match matches.subcommand() {
        Some(("login", sub_matches)) => {
            println!(
                "Logging in {}",
                sub_matches.get_one::<String>("USERNAME").expect("required")
            );
            login(sub_matches.get_one::<String>("USERNAME").expect("required")).await?;
        }
        Some(("signup", sub_matches)) => {
            let username = sub_matches.get_one::<String>("USERNAME").expect("required");
            let email = sub_matches.get_one::<String>("EMAIL").expect("required");
            println!(
                "Signing up {}",
                email
            );
            signup(username, email).await?;
        }
        Some(("deploy", sub_matches)) => {
            println!(
                "Deploying {}",
                sub_matches.get_one::<String>("PATH").expect("required")
            );
            deploy(sub_matches.get_one::<String>("PATH").expect("required")).await?;
        }
        _ => unreachable!(), // If all subcommands are defined above, anything else is unreachable!()
    }
    Ok(())
}