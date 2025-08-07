import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, TAbstractFile, TFile } from 'obsidian';

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

		this.addRibbonIcon('dice', 'Greet', async () => {
			const fileContainsFilter = 'SPL'

			// Get the file using the path
			const files = this.app.vault.getMarkdownFiles()
				.filter((file) => file.name.contains(fileContainsFilter))
				.sort((a, b) => a.name.localeCompare(b.name))
				.map((file) => this.app.vault.getAbstractFileByPath(file.path));
			files.forEach((file, index) => this.createColumn(file, index))
			console.log(files);
			new Notice('Hello, world!');
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
		// This adds an editor command that can perform some operation on the current editor instance
		this.addCommand({
			id: 'sample-editor-command',
			name: 'Sample editor command',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				console.log(editor.getSelection());
				editor.replaceSelection('Sample Editor Command');
			}
		});
		// This adds a complex command that can check whether the current state of the app allows execution of the command
		this.addCommand({
			id: 'open-sample-modal-complex',
			name: 'Open sample modal (complex)',
			checkCallback: (checking: boolean) => {
				// Conditions to check
				const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (markdownView) {
					// If checking is true, we're simply "checking" if the command can be run.
					// If checking is false, then we want to actually perform the operation.
					if (!checking) {
						new SampleModal(this.app).open();
					}

					// This command will only show up in Command Palette when the check function returns true
					return true;
				}
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

			const firstH2SectionPosition = fileContent.search("\n## ");
			console.log(firstH2SectionPosition);
			
			if (firstH2SectionPosition > 0) {
				const h2Sections = fileContent.substring(firstH2SectionPosition).split('\n## ').filter(s => !!s);
				console.log(h2Sections);
				
	
				const canvas = (this.app.workspace.getLeavesOfType('canvas')[0].view as any).canvas;
				console.log(canvas);
				
				let previousY = 0;
				let previousHeight = 0;
				const distanceBetweenNodes = 50;
				const lineHeight = 30;
				for (let i = 0; i < h2Sections.length; i++) {
					const element = h2Sections[i];
					const lines = element.split('\n').length;
					const numberOfImages = element.split('\n').filter((line) => line.contains('.png') || line.contains('.jpg')).length;
					const newHeight = lines * lineHeight + numberOfImages * 250
					const newY = previousY + previousHeight + distanceBetweenNodes;
					const lineNode = canvas.createTextNode({
						pos: { x: positionIndex * 600, y: newY },
						text: `![[${file?.name.replace('.md', '')}#${element.split('\n')[0]}]]`.replace(' #c', ' c'),
						size: { width: 500, height: newHeight },
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
