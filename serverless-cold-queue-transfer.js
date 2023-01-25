const TokenValidator = require('twilio-flex-token-validator').functionValidator;

exports.handler = TokenValidator(async function (context, event, callback) {
    const client = context.getTwilioClient();
    const twiml = new Twilio.twiml.VoiceResponse();
    const { CallSid, TaskQueueSid, TaskSid } = event;

    // Create a custom Twilio Response
    // Set the CORS headers to allow Flex to make an HTTP request to the Twilio Function
    const response = new Twilio.Response();
    response.appendHeader('Access-Control-Allow-Origin', '*');
    response.appendHeader('Access-Control-Allow-Methods', 'OPTIONS POST GET');
    response.appendHeader('Access-Control-Allow-Headers', 'Content-Type');

    //get variables from context
    //this example has a 1:1 mapping for Queue=>Workflow
    const EveryoneQueue = context.EVERYONE_QUEUE_SID  //"Everyone Queue"
    const EveryoneWorkflowSid = context.EVERYONE_WORKFLOW_SID // Transfer "Workflow" for this Queue

    //create a taskqueue to workflow map
    const workflows = {
        [EveryoneQueue]: EveryoneWorkflowSid
    };

    //set transfer (new task) attributes for logging
    const transferAttributes = JSON.stringify({
        originalTask: TaskSid,
        isTransfer: true,
        transferredAt: Date.now(),
        conversation: {
            conversation_id: TaskSid
        }
    });

    //choose workflow to transfer to based on selected transfer taskqueue
    const workflowSid = workflows[TaskQueueSid];
    console.log(`TaskQueue ${TaskQueueSid} matched with Workflow: ${workflowSid}`);

    //set up twiml to use on the Call update
    twiml
        .enqueue({
            workflowSid: workflowSid,
        })
        .task({
            priority: '150' //optional - higher priority for transfers
        }, transferAttributes)

    console.log(`Transferring customer call ${CallSid} with new TwiML ${twiml.toString()}`);

    try {
        const updatedCall = await client.calls(CallSid)
            .update({ twiml: twiml.toString() })

        if (updatedCall) {
            console.log("Successfully updated call ", updatedCall.sid);
            return callback(null, response);
        }
    }
    catch (e) {
        console.error(e);
        response.setStatusCode(500);
        return callback(null, response);
    }
})
