import React from 'react';
import { VERSION, TaskHelper } from '@twilio/flex-ui';
import { FlexPlugin } from '@twilio/flex-plugin';

const PLUGIN_NAME = 'ColdQueueTransferPlugin';

export default class ColdQueueTransferPlugin extends FlexPlugin {
    constructor() {
        super(PLUGIN_NAME);
    }

    /**
     * This code is run when your plugin is being started
     * Use this to modify any UI components or attach to the actions framework
     *
     * @param flex { typeof import('@twilio/flex-ui') }
     * @param manager { import('@twilio/flex-ui').Manager }
     */

    async init(flex, manager) {
        this.registerReducers(manager);

        //replace the default TransferTask Action
        flex.Actions.replaceAction("TransferTask", async (payload, original) => {         
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

            // get url for Twilio Function from environment variable
            const transferCustomerCallFunctionUrl = process.env.TWILIO_FUNCTION_URL_TRANSFERS

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
                if (TaskHelper.isCallTask(payload.task) && payload.options.mode === "COLD" && targetSid.substring(0, 2) === "WQ") {
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

    /**
     * Registers the plugin reducers
     *
     * @param manager { Flex.Manager }
     */
    registerReducers(manager) {
        if (!manager.store.addReducer) {
            // eslint-disable-next-line
            console.error(`You need FlexUI > 1.9.0 to use built-in redux; you are currently on ${VERSION}`);
            return;
        }

        manager.store.addReducer(namespace, reducers);
    }
}
