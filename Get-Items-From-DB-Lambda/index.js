const AWS = require("aws-sdk");
const moment = require("moment");
const { v4: uuidv4 } = require('uuid');
const { reminderEmailTemplate } = require("./reminder");

const dynamoDB = new AWS.DynamoDB.DocumentClient({
    region: "ap-southeast-1",
    apiVersion: "2012-08-10"
});

const SQS = new AWS.SQS({
    region: "ap-southeast-1",
    apiVersion: "2012-11-05"
});

exports.handler = async (event) => {

    const EMAIL_SCHEDULER_TABLE = 'EMAIL_SCHEDULER';
    const SCHEDULED_DATE_INDEX = 'SCHEDULED_DATE_INDEX';
    const SCHEDULED_TIME_INDEX = 'SCHEDULED_TIME_INDEX';
    const SQS_QUEUE_URL = 'example-sqs-url';

    const currentDate = moment().format('YYYY-MM-DD');
    const currentTime = moment().format('HH:mm');
    console.log("----currentTime----", currentTime);
    const params = {
        TableName: EMAIL_SCHEDULER_TABLE,
        IndexName: SCHEDULED_DATE_INDEX,
        KeyConditionExpression: '#date = :dateValue',
        ExpressionAttributeNames: {
            '#date': 'date'
        },
        ExpressionAttributeValues: {
            ':dateValue': currentDate
        }
    };

    try {
        const emailData = await dynamoDB.query(params).promise();
        const filteredItems = emailData.Items.filter(item => item.time.startsWith(currentTime));
        if (filteredItems.length === 0) {
            return { status: 200, message: "No emails to send", };
        }
        for await (const item of filteredItems) {
            let emailDetails = {
                date: item.eventDate,
                time: item.eventTime,
                heading1: item.heading1,
                comName: item.comName,
                comTel: item.comTel,
                comEmail: item.comEmail,
                comLocation: item.comLocation,
                schedulerName: item.schedulerName,
                service: item.service,
                comments: item.comments,
                link: item.link
            }
            // console.log("----emailDetails----", emailDetails);

            const emailBody = reminderEmailTemplate(emailDetails);
            const messageBody = JSON.stringify({
                email: item.userEmail,
                subject: `example-subject`,
                body: emailBody
            });

            // console.log("----messageBody----", messageBody);

            const sqsParams = {
                QueueUrl: SQS_QUEUE_URL,
                MessageBody: messageBody,
                MessageDeduplicationId: uuidv4(),
                MessageGroupId: 'email-scheduler',
            };
            try {
                await SQS.sendMessage(sqsParams).promise();
                console.log("----sqsParams----", sqsParams);
            } catch (e) {
                return { status: 400, message: "Failed to add queue", error: e };
            }
        }
        return { status: 200, message: "Emails queued successfully", };

    } catch (e) {
        return { status: 400, message: "Failed to query data", error: e };
    }
};
