import { execFile, ExecFileException } from 'child_process';
import { existsSync } from 'fs';
import path = require('path');
import { commands, ExtensionContext, ProgressLocation, window } from 'vscode';
import { dockerExec, getBuildFolder, getWorkspaceFolder } from './helpers';
var copy = require('recursive-copy');

var extensionPath: string;

export function activate(context: ExtensionContext) {
	extensionPath = context.extensionPath;

	context.subscriptions.push(commands.registerCommand('mfsc.compileSoC', compileSoC));
	context.subscriptions.push(commands.registerCommand('mfsc.uploadSoC', uploadSoC));
	context.subscriptions.push(commands.registerCommand('mfsc.createProject', createProject));
	context.subscriptions.push(commands.registerCommand('mfsc.compileCode', compileCode));
}

export function deactivate() {}

function createProject(){
	const templateFolder = path.join(extensionPath, "assets/template_project/");
	const workspaceFolder = getWorkspaceFolder();
	
	if (!workspaceFolder){
		window.showErrorMessage("Please open an empty project folder.");
		return;
	}

	return copy(templateFolder, workspaceFolder).catch((error: string) => {
		window.showErrorMessage("Failed to create project: " + error);
	});
}

function compileSoC() {
	const command = [
		"python3",
		"/litex/litex-boards/litex_boards/targets/gsd_orangecrab.py",
		"--device", "85F",
		"--build",
		"--output-dir",
		"/project/build/"
	];

	return dockerExec(command, "Building SoC", "Built SoC!");
}

function compileCode(){
	window.showInformationMessage("asdf");
}

function uploadSoC(){
	const buildFolder = getBuildFolder();

	if (!buildFolder){
		return window.showErrorMessage("No workspace folder open.");
	}

	const bitstreamPath = path.join(buildFolder, "gateware", "gsd_orangecrab.bit");

	if (!existsSync(bitstreamPath)){
		return window.showErrorMessage("No bitstream file found: You must compile the SoC first!")
	}

	const dfuArgs = [
		"-d", "1209:5af0",
		"-a", "0",
		"-D", bitstreamPath
	];

	return window.withProgress({
		location: ProgressLocation.Notification,
		title: "Uploading Bitstream",
		cancellable: false
	}, () => {	
		const p = new Promise<void>(resolve => {
			execFile("dfu-util", dfuArgs, {}, (error: ExecFileException | null) => {
				if (error){
					window.showErrorMessage(error.message);
				}
				else{
					window.showInformationMessage("Succesfully uploaded bitstream!");
				}
				resolve();
			});
		});
		return p;
	});
}