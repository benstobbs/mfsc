import * as vscode from 'vscode';
import { execToolSync, litexPath } from './helpers';
import path = require("path");

const fs = vscode.workspace.fs;

export function activate(context: vscode.ExtensionContext) {
	
	let disposable = vscode.commands.registerCommand('mfsc.compileSoC', () => {
		const orangeCrabBaseSoCPath = path.join(litexPath(), "litex-boards", "litex_boards", "targets", "gsd_orangecrab.py");

		execToolSync("python3", [orangeCrabBaseSoCPath, "--build"]);

		vscode.window.showInformationMessage("Done!");
	});

	context.subscriptions.push(disposable);
}

export function deactivate() {}