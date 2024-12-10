import { wt } from "../config.js";
import { handle_audio } from "../handlers/handle_audio.js";
import { initialize } from "../handlers/initialize.js";
import { record } from "../handlers/record.js";
import { supabase } from "../config.js";
import { OpenAI } from "openai";
import dotenv from "dotenv";

import fs from "fs";

import axios from "axios";

dotenv.config();

let status = "initial";
let notes = "";

let timeoutid = 0;

const reset = () => {
  const id = setTimeout(() => {
    status = "initial";
  }, 1000 * 60 * 5);
  return id;
};

const webhook_get = async (req, res) => {
  // console.log("Request came");
  if (
    req.query["hub.mode"] == "subscribe" &&
    req.query["hub.verify_token"] == "patrose"
  ) {
    res.send(req.query["hub.challenge"]);
  } else {
    res.sendStatus(400);
  }
};

const webhook_post = async (req, res) => {
  // console.log("What the hell");
  const body = wt.parseMessage(req.body);

  const apiKey = process.env.OPENAI_KEY;

  const openai = new OpenAI({ apiKey: apiKey });

  if (body?.isMessage) {
    let incomingMessage = body.message;
    let recipientPhone = incomingMessage.from.phone;
    // console.log(recipientPhone);
    let recipientName = incomingMessage.from.name;
    let typeOfMsg = incomingMessage.type;
    let message_id = incomingMessage.message_id;

    // console.log(typeOfMsg);

    if (typeOfMsg === "text_message" && status == "initial") {
      await initialize(recipientPhone);
    } else if (typeOfMsg === "simple_button_message") {
      const buttonId = incomingMessage.interactive.button_reply;
      if (timeoutid != 0) clearTimeout(timeoutid);
      if (buttonId.id === "save_note") {
        timeoutid = reset();
        status = "waiting";
        await record(recipientPhone);
      }
      if (buttonId.id === "yes") {
        timeoutid = reset();
        status = "waiting";
      }
      if (buttonId.id === "no") {
        timeoutid = reset();
        await wt.sendText({
          message: "Generating PDF...",
          recipientPhone: recipientPhone,
        });
        console.log("API call here");
        // return whatsapp pdf
        const res = await axios.post(
          "https://sahapadi.vercel.app//generate-pdf",
          { content: notes, title: "History", aid_type: "pdf" }
        );
        // console.log("Response is here", res.data);
        fs.writeFileSync("output.pdf", res.data, "binary");
        status = "initial";
        notes = "";

        await wt.sendDocument({
          recipientPhone: recipientPhone,
          file_name: "notes.pdf",
          file_path: "output.pdf",
          caption: "Here are your notes",
          mime_type: "application/pdf",
        });
      }
    } else if (
      incomingMessage.audio &&
      incomingMessage.audio.hasOwnProperty("id") &&
      status === "waiting"
    ) {
      const translation = await handle_audio(incomingMessage.audio.id);

      notes += translation + "\n";

      await wt.sendSimpleButtons({
        recipientPhone: recipientPhone,
        message: `Continue recording?👀`,
        listOfButtons: [
          {
            title: "Yes",
            id: "yes",
          },
          {
            title: "No",
            id: "no",
          },
        ],
      });

      // await Memories.create({ memory: translation.text });
      // const { error } = await supabase.from("memories").insert({
      //   memories: translation,
      //   memory_vector: vectorForm,
      // });
    } else if (typeOfMsg === "text_message" && status == "remember") {
      const { data, error } = await supabase.from("memories").select();

      let memories = "";

      data.map((memory) => {
        memories += memory.memories + ", ";
      });
      console.log(memories);

      const completion = await openai.chat.completions.create({
        messages: [
          {
            role: "system",
            content:
              "You are a helpful assistant to people with dementia who shares memories with you for safe keeping.",
          },
          {
            role: "user",
            content: `${memories} -Each memory are seperate,Provide an accurate answer with an encouraging tone because the person remembered the event and is recalling it, for this question related to only one of these memories ${incomingMessage.text.body}`,
          },
        ],
        model: "gpt-3.5-turbo",
        temperature: 0,
      });

      await wt.sendText({
        message: completion.choices[0].message.content,
        recipientPhone: recipientPhone,
      });

      clearTimeout(timeoutid);
      status = "initial";
    }
  }

  return res.sendStatus(200);
};

export { webhook_get, webhook_post };
