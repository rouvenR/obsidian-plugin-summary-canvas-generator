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

		// This adds a status bar item to the bottom of the app. Does not work on mobile apps.
		const statusBarItemEl = this.addStatusBarItem();
		statusBarItemEl.setText('Status Bar Text');

		// This adds a simple command that can be triggered anywhere
		this.addCommand({
			id: 'open-sample-modal-simple',
			name: 'Open sample modal (simple)',
			callback: () => {
				new SampleModal(this.app).open();
			}
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SampleSettingTab(this.app, this));

		// If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
		// Using this function will automatically remove the event listener when this plugin is disabled.
		this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
			console.log('click', evt);
		});

		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));
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
				console.log(fileContent);  // Output the content (you can process it as needed)
				
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
			console.log(h1Sections);

			const canvas = (this.app.workspace.getLeavesOfType('canvas')[0].view as any).canvas;
			console.log(canvas);
			
			let previousY = 0;
			let previousHeight = 0;
			for (let i = 1; i < h1Sections.length; i++) { // i = 1 to skip part before first header
				const h1Section = h1Sections[i];
				const firstH2Position = h1Section.search(/[#]{2,2} /gm);
				console.log(firstH2Position);
				
				const h1Text = h1Section.substring(0, firstH2Position);
				console.log(h1Text);
				

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
				console.log(h2Sections);
				

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
					console.log(lineNode);
					
					previousHeight = newHeight;
					previousY = newY;
					
				}
			}
			
			
			canvas.requestSave();
	}
}

class SampleModal extends Modal {
	constructor(app: App) {
		super(app);
	}

	onOpen() {
		const {contentEl} = this;
		contentEl.setText('Woah!');
	}

	onClose() {
		const {contentEl} = this;
		contentEl.empty();
	}
}

class SampleSettingTab extends PluginSettingTab {
	plugin: SummaryCanvasGeneratorPlugin;

	constructor(app: App, plugin: SummaryCanvasGeneratorPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName('Setting #1')
			.setDesc('It\'s a secret')
			.addText(text => text
				.setPlaceholder('Enter your secret')
				.setValue(this.plugin.settings.mySetting)
				.onChange(async (value) => {
					this.plugin.settings.mySetting = value;
					await this.plugin.saveSettings();
				}));
	}
}
