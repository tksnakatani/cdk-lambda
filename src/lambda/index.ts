exports.handler = async function (event: any ){
    console.log("request:", JSON.stringify(event, undefined, 2));
    return {
        statusCode: 200,
        header: { "Content-Type": "text/plain" },
        body: `Hello cdk`
    }
}