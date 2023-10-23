/**
intended to be used with Flex UI v2.x
**/

async init(flex, manager) {
    
    //replace the default TransferTask Action
    flex.Actions.replaceAction("TransferTask", async (payload, original) => {  
        // assign the Twilio Serverless Function URL to a variable
        const transferCustomerCallFunctionUrl = process.env.TWILIO_FUNCTION_URL_TRANSFERS //replace with your URL after deployment of Function
        
        //get customer Call SID from Task Attributes
        const customerCallSid = payload.task.attributes.conference.participants.customer

        //get the TaskQueueSID or WorkerSID from the transfer request
        const { targetSid } = payload

        //store the TaskSID for reporting and logging
        const taskSid = payload.task._task.sid
        
        //logging
        console.log(`DEBUG: Custom TransferTask triggered with ${taskSid} and ${targetSid}`)

        //set up parameters to pass to Twilio Function
        const body = {
            Token: manager.store.getState().flex.session.ssoTokenPayload.token,
            CallSid: customerCallSid,
            TaskQueueSid: targetSid,
            TaskSid: payload.task._task.sid
        }

        // set up request options
        const httpOpts = {
            method: 'POST',
            body: new URLSearchParams(body),
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
            }
        }

        // try to do a custom transfer by making a request to the Twilio Function
        try {
            //only do this for COLD Voice transfers to a TaskQueue
            if (payload.task.taskChannelUniqueName === "voice" && payload.options.mode === "COLD" && targetSid.substring(0, 2) === "WQ") {
                console.log(`DEBUG: Creating new TransferTask for originalTask ${taskSid} and going to Queue ${targetSid}`)
                await fetch(transferCustomerCallFunctionUrl, httpOpts)
            }
            //if WARM or if to WORKER, default to original action
            else {
                await original(payload)
            }

        }
        // log the error
        catch (e) {
            console.error(`Failed to transfer call ${customerCallSid} ${taskSid}.`)
            console.error(e)
        }
    })

}
