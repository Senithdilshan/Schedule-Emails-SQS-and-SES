const AWS = require("aws-sdk");
const SES = new AWS.SES({ region: "ap-southeast-1" });
exports.handler = async (event) => {
    const { Records } = event;
    const emailData = JSON.parse(Records[0].body);
    const { email, subject, body } = emailData;
    console.log("----Event", emailData);

    const params = {
        Destination: {
            ToAddresses: [email],
        },
        Message: {
            Body: {
                Html: {
                    Charset: "UTF-8",
                    Data: body,
                },
            },
            Subject: {
                Charset: "UTF-8",
                Data: subject,
            },
        },
        Source: "exampleEmail@abc.com",
    };
    try {
        await SES.sendEmail(params).promise();
        return { status: 200, message: "Email sent successfully" };
    } catch (error) {
        console.log(error);
        return { status: 400, message: "Failed to send Email", error: e };
    }
}