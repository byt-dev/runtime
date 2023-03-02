const bucket = new Bucket("test")

bucket.on("put", (event) => {
  console.log("Put event", event)
})

export default {
  bindings: [bucket]
}



// brn:<tenant>:<env>:<service>:<version>:<resource>:<>