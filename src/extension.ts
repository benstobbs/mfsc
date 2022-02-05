import { execSync } from 'child_process';
import { existsSync, mkdirSync } from 'fs';
import path = require('path');
import * as vscode from 'vscode';

const fs = vscode.workspace.fs;

export function activate(context: vscode.ExtensionContext) {
	
	let disposable = vscode.commands.registerCommand('mfsc.compileSoC', () => {
		const workspaceFolders = vscode.workspace.workspaceFolders;

		if (workspaceFolders){
			const workspacePath = workspaceFolders[0].uri.path;
			var buildFolder = path.join(workspacePath, "build");

			// /c:/... --> c:/...
			if (process.platform === "win32" && buildFolder[0] === "\\"){
				buildFolder = buildFolder.slice(1);
			}

			if (!existsSync(buildFolder)){
				mkdirSync(buildFolder);
			}

			const command = `docker run --rm -v ${buildFolder}:/project benstobbs/litex-runner python3 /litex/litex-boards/litex_boards/targets/gsd_orangecrab.py --build --output-dir /project/`;
			execSync(command);
			
			vscode.window.showInformationMessage("Done!");
		}
		else{
			vscode.window.showErrorMessage("No workspace folder open.");
		}
	});

	context.subscriptions.push(disposable);
}

export function deactivate() {}