use clap::{arg, Command};
use byt_cli::login::login;
use byt_cli::signup::signup;
use byt_cli::deploy::deploy;
use byt_cli::confirm::confirm;

fn cli() -> Command {
    Command::new("byt")
        .about("The byt.dev CLI")
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
            Command::new("confirm")
                .about("Confirm signup to byt.dev")
                .arg(arg!(<USERNAME> "The username used for signing up"))
                .arg(arg!(<CODE> "The confirmation code received via email"))
                .arg_required_else_help(true),
        )
        .subcommand(
            Command::new("deploy")
                .about("Deploy a file to byt.dev")
                .arg(arg!(<PATH> "The file to deploy"))
        )
        .subcommand(
            Command::new("version")
                .about("Get the version of the byt CLI")
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
        Some(("confirm", sub_matches)) => {
            let username = sub_matches.get_one::<String>("USERNAME").expect("required");
            let code = sub_matches.get_one::<String>("CODE").expect("required");
            println!(
                "Confirming Sign up {}",
                username
            );
            confirm(username, code).await?;
        }
        Some(("deploy", sub_matches)) => {
            println!(
                "Deploying {}",
                sub_matches.get_one::<String>("PATH").expect("required")
            );
            deploy(sub_matches.get_one::<String>("PATH").expect("required")).await?;
        }
        Some(("version", _)) => {
            println!("byt version {}", env!("CARGO_PKG_VERSION"));
        }
        _ => {
            print!("Command not found\n\n");
            cli().print_help()?;
        }
    }
    Ok(())
}