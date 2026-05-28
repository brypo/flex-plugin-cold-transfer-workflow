/**
 * Flex UI v2.x
 * Replace the init(flex, manager) method of your FlexPlugin class.
 */

async init(flex, manager) {

    flex.Actions.replaceAction("TransferTask", async (payload, original) => {
        const transferFunctionUrl = process.env.TWILIO_FUNCTION_URL_TRANSFERS;
        const customerCallSid = payload.task.attributes.conference.participants.customer;
        const { targetSid } = payload;
        const taskSid = payload.task.taskSid; 

        console.log(`DEBUG: Custom TransferTask triggered — task ${taskSid}, target ${targetSid}`);

        // Only intercept COLD Voice transfers to a TaskQueue
        if (
            payload.task.taskChannelUniqueName === "voice" &&
            payload.options.mode === "COLD" &&
            targetSid.startsWith("WQ") // fix: was brittle substring check
        ) {
            const body = {
                Token: manager.store.getState().flex.session.ssoTokenPayload.token,
                CallSid: customerCallSid,
                TaskQueueSid: targetSid,
                TaskSid: taskSid
            };

            const httpOpts = {
                method: "POST",
                body: new URLSearchParams(body),
                headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" }
            };

            try {
                console.log(`DEBUG: Routing task ${taskSid} to queue ${targetSid} via workflow`);
                await fetch(transferFunctionUrl, httpOpts);
            } catch (e) {
                console.error(`[ColdTransfer] Custom transfer FAILED — falling back to default transfer behavior.`);
                console.error(`[ColdTransfer] Context: taskSid=${taskSid}, callSid=${customerCallSid}, targetQueue=${targetSid}`);
                console.error(`[ColdTransfer] Function URL: ${transferFunctionUrl}`);
                console.error(`[ColdTransfer] Error:`, e?.message ?? e);
                console.warn(`[ColdTransfer] WARNING: Fallback transfer will NOT route through a Workflow. Caller may be stuck if the target queue has no available agents.`);
                await original(payload);
            }

        } else {
            // WARM transfer or Worker target — use default behavior
            await original(payload);
        }
    });
}
