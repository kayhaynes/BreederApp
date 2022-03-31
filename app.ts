import dotenv from "dotenv-safe"
import express, { Request, Response } from "express"
import freeclimbSdk from "@freeclimb/sdk"
import bodyParser from "body-parser"
import { Console } from "console"
import { Interface } from "readline"
import e from "express"



interface SmsBody {
    from: string
    to: string
    text: string
}

interface instruction {
    script: string
    redirect: string
}

interface InstructionMap {
    [key: string]: instruction
}

let mainMenuErrorCount = 0

dotenv.config()
const { ACCOUNT_ID, API_KEY, HOST_URL, PORT } = process.env


const app = express()
app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json())

const freeclimb = freeclimbSdk(ACCOUNT_ID, API_KEY)

app.post("/incomingCall", async (req: Request, res: Response) => {
    const redirectUrl = `${HOST_URL}/mainMenuPrompt`
    const greeting = "Hello Dog Breeder is not in service right now."
    const welcomePercl = freeclimb.percl.build(
        freeclimb.percl.say(greeting),
        freeclimb.percl.pause(100),
        freeclimb.percl.redirect(redirectUrl)
    )
    res.json(welcomePercl)
})
app.post("/incomingSms", async (req: Request, res: Response) => {
    const { from, to } = req.body
    await freeclimb.api.messages.create(to, from, "Breeder is not here right now.")
    res.sendStatus(200)
})
app.post("/mainMenuPrompt", async (req: Request, res: Response<freeclimbSdk.PerCL.Command[]>) => {
    const actionUrl = `${HOST_URL}/mainMenu`
    const getDigitsPercl = freeclimb.percl.getDigits(actionUrl, {
        prompts: [
            freeclimb.percl.say("Please stay online while our menu loads"),
            freeclimb.percl.pause(100),
            freeclimb.percl.say("For Puppy orders press 1"),
            freeclimb.percl.say("For our older dogs press 2"),
            freeclimb.percl.say("For client personal press 3")
        ],
        maxDigits: 1,
        minDigits: 1
    })
    res.json(freeclimb.percl.build(getDigitsPercl))
})




app.post("/mainMenu", async (req: Request<any, freeclimbSdk.PerCL.Command[], { digits: string }>, res) => {
    const { digits } = req.body
    const instructionMap: InstructionMap = {
        "1": {
            script: "Redirecting your call to existing operator",
            redirect: `${HOST_URL}/endCall`
        },
        "2": {
            script: "Redirecting your call to existing operator",
            redirect: `${HOST_URL}/endCall`
        },
        "3": {
            script: "Time opens are 7 am to 7pm everyday besides Saturday and Sunday we are closed",
            redirect: `${HOST_URL}/endCall`
        }
    }
    const a = {
        "freeName": "Someone"
    }
    const redirectUrl = `${HOST_URL}/mainMenuPrompt`
    const instructions = instructionMap[digits]
    // invalid input and less than error retry limit
    if ((!digits || !instructions) && mainMenuErrorCount < 3) {
        mainMenuErrorCount++
        res.json(
            freeclimb.percl.build(
                freeclimb.percl.say("Error, please try again"),
                freeclimb.percl.redirect(redirectUrl)
            )
        )
    }
    // surpassed error retry limit
    else if (mainMenuErrorCount >= 3) {
        mainMenuErrorCount = 0
        res.json(
            freeclimb.percl.build(
                freeclimb.percl.say("Maximum retry limit was reached"),
                freeclimb.percl.redirect(`${HOST_URL}/endCall`)
            )
        )
    }
    // user provided good input
    else {
        mainMenuErrorCount = 0
        res.json(
            freeclimb.percl.build(
                freeclimb.percl.say(instructions.script),
                freeclimb.percl.redirect(instructions.redirect)
            )
        )
    }
})

app.post("/transfer", (req: Request, res: Response) => {
    res.json(
        freeclimb.percl.build(
            freeclimb.percl.say("please wait while we transfer you to an operator"),
            freeclimb.percl.redirect(`${HOST_URL}/endcall`)
        )
    )

})

app.post("/endCall", (req: Request, res: Response) => {
    res.json(
        freeclimb.percl.build(
            freeclimb.percl.say("thank you for calling kay breeders, have a nice day"),
            freeclimb.percl.hangup()
        )
    )
})

app.listen(PORT, () => {
    console.log(`Server is running at: ${PORT}`)
})


