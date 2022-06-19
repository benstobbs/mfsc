import { execFile, ExecFileException } from 'child_process';
import { existsSync } from 'fs';
import path = require('path');
import { commands, ExtensionContext, ProgressLocation, window } from 'vscode';
import { dockerExec, getBuildFolder, getWorkspaceFolder, displayOutput } from './helpers';
var copy = require('recursive-copy');
import { SerialPort } from 'serialport'

var extensionPath: string;

export function activate(context: ExtensionContext) {
	extensionPath = context.extensionPath;

	context.subscriptions.push(commands.registerCommand('mfsc.compileSoC', compileSoC));
	context.subscriptions.push(commands.registerCommand('mfsc.uploadSoC', uploadSoC));
	context.subscriptions.push(commands.registerCommand('mfsc.createProject', createProject));
	context.subscriptions.push(commands.registerCommand('mfsc.compileCode', compileCode));
	context.subscriptions.push(commands.registerCommand('mfsc.runProgram', runProgram));
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
		"/target.py",
		"--device", "85F",
		"--build",
		"--output-dir",
		"/project/build/"
	];

	return dockerExec(command, "Building SoC", "Built SoC!");
}

function compileCode(){
	const command = [
		"make",
		"-C", "/project/"
	];

	return dockerExec(command, "Compiling code", "Compiled!");
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
			const dfuUtil = execFile("dfu-util", dfuArgs, {}, (error: ExecFileException | null) => {
				if (error){
					window.showErrorMessage(error.message);
				}
				else{
					window.showInformationMessage("Succesfully uploaded bitstream!");
				}
				resolve();
			});

			displayOutput(dfuUtil, "MFSC: Upload SoC");
		});
		return p;
	});
}

function runProgram(){
	const workspaceFolder = getWorkspaceFolder();

	if (!workspaceFolder){
		return window.showErrorMessage("No workspace folder open.");
	}

	const programPath = path.join(workspaceFolder, "program.bin");

	if (!existsSync(programPath)){
		return window.showErrorMessage("No program found. Compile C code first!");
	}

	return SerialPort.list().then((portInfos) => {
		if (portInfos.length < 1){
			return window.showErrorMessage("No serial ports found.");
		}

		const portPaths = portInfos.map((port) => port.path);

		return window.showQuickPick(portPaths, {canPickMany: false}).then((selection) => {
			if (!selection){
				return window.showErrorMessage("You must select a serial port.")
			}
			return new Promise<string>(resolve => {
				const litexArgs = [
					"--serial-boot",
					"--kernel=" + programPath,
					selection
				];

				const litexTerm = execFile("litex_term", litexArgs, {shell: true});
				displayOutput(litexTerm, "MFSC: Run Program");

				litexTerm.on("close", () => {
					resolve("LiteX term closed.");
				});
			});
		});
	});
}