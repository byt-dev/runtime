source = ["./target/release/byt"]
bundle_id = "dev.byt.cli"

apple_id {
  username = "paket@korfmann.net"
  password = "@env:AC_PASSWORD"
}

sign {
  application_identity = "1E715099E3AEE88CE206E4A448021273BCE147F2"
}

dmg {
  output_path = "target/release/byt-x86_64-apple-darwin.dmg"
  volume_name = "Byt"
}

zip {
  output_path = "target/release/byt-x86_64-apple-darwin.zip"
}