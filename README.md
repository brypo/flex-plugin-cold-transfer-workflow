# Twilio Flex Solution to re-route Voice transfers through TaskRouter Workflow

### Why was this created?
By default, Flex will **NOT** route transferred Tasks through a Workflow. When a Task is transferred, it will route directly to the AGENT or QUEUE selected in the WorkerDirectory component. No further routing logic will be applied. 

![image](https://user-images.githubusercontent.com/67924770/157151805-3db3402d-5360-4f1c-9b8c-8e4be789cc23.png)

This becomes a concern when a Queue has no available agents and will not have any available agents for the foreseeable future, like a department that closes for the weekends. A caller transferred to a Queue with no available agents will wait on the line until an agent becomes available or until it reaches the Twilio Voice limit of 24 hours.

This solution will solve this problem by sending COLD-transferred Tasks through a Workflow to allow for routing logic to be applied again.


## How does this work?

On the **front-end**, we use a [Flex Plugin](https://www.twilio.com/docs/flex/developer/ui-and-plugins) to replace the ["TransferTask" Action](https://www.twilio.com/docs/flex/developer/ui/v1/actions). If we detect the transfer is a COLD, Queue transfer for a Voice Task, then we make a request to a [Twilio Serverless Function](https://www.twilio.com/docs/serverless/functions-assets/functions) to handle the transfer in a custom way.

On the **back-end**, from the Function, we update the customer's call leg with new TwiML instructions. The new TwiML tells the Call to [<Enqueue>](https://www.twilio.com/docs/voice/twiml/enqueue) to a new TaskRouter Workflow. Updating the Call cancels the original Task, and the <Enqueue> instruction created a new Task for the Call.


## Flex Plugin

The code provided is intended to be incorporated into standard plugin architecture.

To get started, follow these instructions to [set up a sample Flex plugin](https://www.twilio.com/docs/flex/quickstart/getting-started-plugin#set-up-a-sample-flex-plugin), navigate to the [main part](https://www.twilio.com/docs/flex/quickstart/getting-started-plugin#build-your-flex-plugin) of your plugin, and replace the `src/SamplePlugin.js` code with what's provided in the above *plugin* file.'

### Plugin Environment Variables

This Plugin is using an environment variable defined in the `.env` file. This stores the deployed Serverless Function URL:
`process.env.TWILIO_FUNCTION_URL_TRANSFERS` = URL to your Serverless Function

To learn more about setting up Environment Variables in a Flex Plugin, check out [this doc](https://www.twilio.com/docs/flex/developer/plugins/environment-variables#:~:text=Keep%20in%20mind%20that%20the%20environment%20variable%20names%20are%20required%20to%20start%20with%20TWILIO_%2C%20FLEX_%20or%20REACT_).

## Serverless Function

A Serverless Function is used to process the custom Task logic. 

### Environment Variables

| Variable | Example Identifier |
| ----- | ---- |
| `EVERYONE_WORKFLOW_SID` | WWxxxxxxxxxx |
| `EVERYONE_QUEUE_SID' | WQxxxxxxxx |


## Disclaimer
This software is to be considered "sample code", a Type B Deliverable, and is delivered "as-is" to the user. Twilio bears no responsibility to support the use or implementation of this software.
