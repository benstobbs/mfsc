import * as assert from 'assert';
import path = require('path');
import { existsSync, mkdirSync } from 'fs';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';

suite('Extension Test Suite', () => {
	vscode.window.showInformationMessage('Start all tests.');

	test('Run Build SoC Command', async () => {
		const testProjectFolder = path.resolve("extension_test_project");

		if (!existsSync(testProjectFolder)){
			mkdirSync(testProjectFolder);
		}
		
		let uri = vscode.Uri.file(testProjectFolder);
		await vscode.commands.executeCommand('vscode.openFolder', uri);
		
		await vscode.commands.executeCommand("mfsc.compileSoC").then(() => {
			assert.strictEqual(existsSync(path.join(testProjectFolder, "build", "gateware", "gsd_orangecrab.bit")), true);
		});
	});
});
