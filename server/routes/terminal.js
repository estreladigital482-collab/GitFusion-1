import express from 'express';
import { runTerminalCommand } from '../services/terminal.js';

export const terminalRouter = express.Router();

terminalRouter.post('/run', async (req, res) => {
  const { command } = req.body || {};
  const result = await runTerminalCommand(command);
  res.json(result);
});
