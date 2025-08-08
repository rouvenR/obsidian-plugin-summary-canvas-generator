import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, TAbstractFile, TFile } from 'obsidian';

export class SearchStringModal extends Modal {
  constructor(app: App, onSubmit: (result: string) => void) {
    super(app);
	this.setTitle('What .md files should be included?');

	let name = '';
    new Setting(this.contentEl)
      .setName('Name (contains search)')
      .addText((text) =>
        text.onChange((value) => {
          name = value;
        }));
		
	this.contentEl.createEl('p', { text: 'Summary will be added to canvas: ' + (this.app.workspace.getLeavesOfType('canvas')[0].view as any).file.path })

    new Setting(this.contentEl)
      .addButton((btn) =>
        btn
          .setButtonText('Submit')
          .setCta()
          .onClick(() => {
            this.close();
            onSubmit(name);
          }));
  }
}
// Remember to rename these classes and interfaces!

interface SummaryCanvasGeneratorSettings {
	mySetting: string;
}

const DEFAULT_SETTINGS: SummaryCanvasGeneratorSettings = {
	mySetting: 'default'
}

export default class SummaryCanvasGeneratorPlugin extends Plugin {
	settings: SummaryCanvasGeneratorSettings;

	async onload() {
		await this.loadSettings();

		this.addRibbonIcon('layout-panel-left', 'Generate Canvas Summary', async () => {
			new SearchStringModal(this.app, (fileContainsFilter) => {
				// Get the file using the path
				const files = this.app.vault.getMarkdownFiles()
					.filter((file) => file.name.contains(fileContainsFilter))
					.sort((a, b) => a.name.localeCompare(b.name))
					.map((file) => this.app.vault.getAbstractFileByPath(file.path));
				files.forEach((file, index) => this.createColumn(file, index))
				console.log(files);
				new Notice('Canvas filled successfully!');
			}).open();
		});
	}

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	async createColumn(file: TAbstractFile | null, positionIndex: number) {
			
			let fileContent = "";	  
			if (file instanceof TFile) {
			  try {
				// Read the content of the file
				fileContent = await this.app.vault.read(file);
				
			  } catch (err) {
				console.error("Error reading file:", err);
			  }
			} else {
			  console.log(`File not found: ${file?.name}`);
			}
			const DEFAULT_DISTANCE_BETWEEN_NODES = 50;
			const DEFAULT_LINE_HEIGHT = 30;
			const DEFAULT_IMAGE_HEIGHT = 250;
			const DEFAULT_DISTANCE_BETWEEN_COLUMNS = 700;
			const DEFAULT_COLUMN_WIDTH = 500;
			const H2_X_OFFSET = 50;

			const h1Sections = fileContent.split(/\n[#]{1,1} /gm).filter(s => !!s);

			const canvas = (this.app.workspace.getLeavesOfType('canvas')[0].view as any).canvas;
			
			let previousY = 0;
			let previousHeight = 0;
			for (let i = 1; i < h1Sections.length; i++) { // i = 1 to skip part before first header
				const h1Section = h1Sections[i];
				const firstH2Position = h1Section.search(/[#]{2,2} /gm);
				
				const h1Text = h1Section.substring(0, firstH2Position);

				if (h1Text.length > 0) {
					const lines = h1Text.split('\n').length;
					const numberOfImages = h1Text.split('\n').filter((line) => line.contains('.png') || line.contains('.jpg')).length;
					const newHeight = lines * DEFAULT_LINE_HEIGHT + numberOfImages * DEFAULT_IMAGE_HEIGHT
					const newY = previousY + previousHeight + DEFAULT_DISTANCE_BETWEEN_NODES;
					canvas.createTextNode({
						pos: { x: positionIndex * DEFAULT_DISTANCE_BETWEEN_COLUMNS, y: newY },
						text: '# ' + h1Text,
						size: { width: DEFAULT_COLUMN_WIDTH, height: newHeight },
						focus: false,
					});
					
					previousHeight = newHeight;
					previousY = newY;
				}

				const h2Sections = h1Section.split(/[#]{2,2} /gm)

				for (let j = 1; j < h2Sections.length; j++) {
					const h2Section = h2Sections[j];

					const lines = h2Section.split('\n').length;
					const numberOfImages = h2Section.split('\n').filter((line) => line.contains('.png') || line.contains('.jpg')).length;
					const newHeight = lines * DEFAULT_LINE_HEIGHT + numberOfImages * DEFAULT_IMAGE_HEIGHT
					const newY = previousY + previousHeight + DEFAULT_DISTANCE_BETWEEN_NODES;
					const lineNode = canvas.createTextNode({
						pos: { x: positionIndex * DEFAULT_DISTANCE_BETWEEN_COLUMNS + H2_X_OFFSET, y: newY },
						text: `![[${file?.name.replace('.md', '')}#${h2Section.split('\n')[0]}]]`.replace(' #c', ' c'),
						size: { width: DEFAULT_COLUMN_WIDTH, height: newHeight },
						focus: false,
					});
					
					previousHeight = newHeight;
					previousY = newY;
					
				}
			}
			
			
			canvas.requestSave();
	}
}