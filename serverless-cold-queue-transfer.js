const TokenValidator = require('twilio-flex-token-validator').functionValidator;

exports.handler = TokenValidator(async function (context, event, callback) {
    const client = context.getTwilioClient();
    const { CallSid, TaskQueueSid, TaskSid } = event;

    console.log(`[ColdTransfer] Received transfer request — CallSid=${CallSid}, TaskSid=${TaskSid}, TaskQueueSid=${TaskQueueSid}`);

    const response = new Twilio.Response();
    response.appendHeader('Access-Control-Allow-Origin', '*'); 
    response.appendHeader('Access-Control-Allow-Methods', 'OPTIONS POST GET');
    response.appendHeader('Access-Control-Allow-Headers', 'Content-Type');

    // 1:1 mapping of TaskQueue SID => Workflow SID
    // To support more queues, add entries here: [context.OTHER_QUEUE_SID]: context.OTHER_WORKFLOW_SID
    const workflows = {
        [context.EVERYONE_QUEUE_SID]: context.EVERYONE_WORKFLOW_SID
    };

    const workflowSid = workflows[TaskQueueSid];

    if (!workflowSid) {
        console.error(`[ColdTransfer] No workflow mapped for queue ${TaskQueueSid}. Known queues: ${Object.keys(workflows).join(', ')}. Returning 400.`);
        response.setStatusCode(400);
        return callback(null, response);
    }

    const transferAttributes = JSON.stringify({
        originalTask: TaskSid,
        isTransfer: true,
        transferredAt: Date.now(),
        conversation: { conversation_id: TaskSid }
    });

    const twiml = new Twilio.twiml.VoiceResponse();
    twiml
        .enqueue({ workflowSid })
        .task({ priority: 150 }, transferAttributes); // elevated priority so transfers are picked up before new inbound tasks

    const twimlString = twiml.toString();
    console.log(`[ColdTransfer] Updating call ${CallSid} with TwiML: ${twimlString}`);

    try {
        const updatedCall = await client.calls(CallSid).update({ twiml: twimlString });
        console.log(`[ColdTransfer] Successfully updated call ${updatedCall.sid} — task will be re-queued to workflow ${workflowSid}`);
        return callback(null, response);
    } catch (e) {
        console.error(`[ColdTransfer] Failed to update call ${CallSid} — caller may be stuck on original task ${TaskSid}`);
        console.error(`[ColdTransfer] Target workflow: ${workflowSid}, TwiML attempted: ${twimlString}`);
        console.error(`[ColdTransfer] Error:`, e?.message ?? e);
        response.setStatusCode(500);
        return callback(null, response);
    }
});
