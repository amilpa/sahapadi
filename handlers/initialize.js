import { wt } from "../config.js";

export const initialize = async (recipientPhone) => {
  await wt.sendSimpleButtons({
    recipientPhone: recipientPhone,
    message: `Welcome to sahapadi!\n\nI’m here to help turn your voice into dyslexic-friendly PDF notes 🗣️➡️📄\n\n Record your thoughts, and I’ll convert them into accessible notes 📝`,
    listOfButtons: [
      {
        title: "Start recording",
        id: "save_note",
      },
    ],
  });
};
