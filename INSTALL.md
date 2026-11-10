# Installing Written Words on Windows

Written Words counts the words you actually type in the folders you choose. Pasted text does not count. This guide shows you step by step how to add the plugin to Obsidian. No technical knowledge is needed.

> **Note:** the plugin itself is in Dutch. Where this guide mentions a button or label from the plugin, the Dutch text is shown as it appears on screen, followed by its English meaning.

**You will need**

- Obsidian for Windows (version 1.4.10 or newer)
- The `written-words` folder or the `written-words.zip` file
- About 10 minutes

---

## Step 1: Find your vault folder

Your vault is the folder where Obsidian stores your notes.

1. Open Obsidian and your vault.
2. In the file list on the left, right-click a note.
3. Choose **Show in system explorer**.
4. A File Explorer window opens showing your note. This is your vault folder. If your notes are in subfolders, use the up arrow (top left in File Explorer) to go to the main folder of the vault, where the `.obsidian` folder should also be.

## Step 2: Show hidden folders

Obsidian stores its settings in a hidden folder. You need to make it visible first.

1. At the top of File Explorer, click **View**.
2. Choose **Show** and tick **Hidden items**.
3. You will now see a folder called `.obsidian`. Open it.

## Step 3: Put the plugin in the right place

1. Is there a `plugins` folder inside `.obsidian`? If not, create one: right-click, **New**, **Folder**, and name it `plugins` (all lowercase).
2. Open the `plugins` folder.
3. If you received a zip file: right-click `written-words.zip` and choose **Extract All**.
4. Copy the `written-words` folder into the `plugins` folder.

**Check this carefully.** Open the `written-words` folder. You should see these three files directly inside it:

- `main.js`
- `manifest.json`
- `styles.css`

If you see a second `written-words` folder there instead, the plugin is one folder too deep. Drag the three files up one level. The full location is:

`your vault\.obsidian\plugins\written-words\main.js`

## Step 4: Enable the plugin in Obsidian

1. In Obsidian, click the **gear icon** (Settings) in the bottom left.
2. Choose **Community plugins**.
3. Is there a **Turn on community plugins** button? Click it and confirm. This is required for any plugin that is not from the official list, and Written Words is one of those.
4. Next to **Installed plugins**, click the icon with two arrows (reload).
5. Turn on **Written Words** with the toggle.

The bottom right of the screen now shows `✍ 0 / 500 woorden` ("words"). That means it works.

## Step 5: Choose which folders are counted

Without any folders, the plugin counts nothing.

1. Go to **Settings** and scroll down on the left to **Written Words**.
2. Under **Map toevoegen** ("Add folder"), click the box and choose a folder from the list that appears.
3. Click **Toevoegen** ("Add").
4. You can also set your daily goal here under **Dagdoel** ("Daily goal"). The default is 500 words.

Only what you type in these folders counts, including their subfolders.

## How to use it

- The **bottom right** shows how much you have written today.
- Click the pencil icon in the bar on the **left**, or press Ctrl+P and type `Written Words: open statistieken` ("open statistics"). You will see your day, week and month, an overview per folder and a calendar of the past year.
- Only **typed** words count. Text you paste, or text inserted by a template or another plugin, does not count.
- If you remove new words within 20 seconds, they do not count. This way a typo you fix right away is not counted twice.

---

## Troubleshooting

**Written Words is not in the list of plugins**
The folder is in the wrong place or one level too deep. Go through step 3 again and then click the reload icon.

**It shows `0 woorden` while I am typing**
Check that you are typing in a folder you added in step 5. The note itself must be in that folder (or a subfolder).

**I can't see the `.obsidian` folder**
Repeat step 2 and make sure **Hidden items** is ticked.

**Windows shows a warning**
When copying the folder, Windows sometimes asks for confirmation. Choose **Continue**.

## Updating and removing

**Updating to a new version:** replace the three files in the `written-words` folder with the new ones. Do not delete the `data.json` file, because it contains all your counts. Then restart Obsidian.

**Removing:** turn off the plugin in Settings, **Community plugins**, and then delete the `written-words` folder. Your counts will be deleted too. To keep them, first go to **Settings**, **Written Words**, choose **Exporteren als CSV** ("Export as CSV") and keep the file that appears in your vault.
