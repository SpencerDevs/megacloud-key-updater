import fs from "fs";
import axios from "axios";
import * as babel from '@babel/core';
import { normalizeLiterals } from './transformers/normalizeLiterals.js';
import { controlFlowUnflattener } from './transformers/controlFlowUnflattener.js';
import { inlineArrayBuilder } from './transformers/inlineArrayBuilder.js';
import { inlineWrapperFunctions } from './transformers/inlineProxiedFunctions.js';
import { solveStringArray } from './transformers/solveStringArray.js';
import { solveStateMachine } from './transformers/solveStateMachine.js';
import { inlineStringArray } from './transformers/inlineStringArray.js';

async function start() {
    const e = await axios.get(`https://videostr.net/js/player/m/v2/pro/embed-1.min.js?v=${Date.now()}`);
    fs.writeFileSync("input.txt", e.data)
    await decrypt()
    await updatekey();
}

async function decrypt() {
    try {
        let intermediateCode;
        // normalize literals and unflatten cf
        const inputCode = fs.readFileSync('input.txt', 'utf-8');
        console.log("--- Starting Pass 1: Normalizing Literals and Unflattening Control Flow ---");
        const unflattenedResult = babel.transformSync(inputCode, {
            sourceType: "script",
            plugins: [normalizeLiterals, controlFlowUnflattener],
            code: true
        });
    
        if (!unflattenedResult || !unflattenedResult.code) {
            throw new Error("Pass 1 (Normalizing and unflattening) failed to produce code.");
        }
        intermediateCode = unflattenedResult.code;
        fs.writeFileSync('output.js', intermediateCode, 'utf-8');
        console.log("Pass 1 complete.");
    
        // inline data
        console.log("--- Starting Pass 2: Inlining Arrays and Wrapper Funcs ---")
        const inlinedDataResult = babel.transformSync(intermediateCode, {
            sourceType: "script",
            plugins: [inlineArrayBuilder, inlineWrapperFunctions],
            code: true
        });
    
        if (!inlinedDataResult || !inlinedDataResult.code) {
            throw new Error("Pass 2 (Inlining Arbitrary Data) failed to produce code.");
        }
        intermediateCode = inlinedDataResult.code;
        fs.writeFileSync('output.js', intermediateCode, 'utf-8');
        console.log("Pass 2 complete.")
    
        // solve string array and state machine
        console.log("--- Starting Pass 3: Solving String Array and Solving State Machine ---")
        const transformStringArray = babel.transformSync(intermediateCode, {
            sourceType: "script",
            plugins: [solveStringArray, solveStateMachine],
            code: true
        });
    
        if (!transformStringArray || !transformStringArray.code) {
            throw new Error("Pass 3 (Solving String Array & State Machine) failed to produce code.");
        }
        intermediateCode = transformStringArray.code;
        fs.writeFileSync('output.js', intermediateCode, 'utf-8');
        console.log("Pass 3 complete.")
    
    
        // solve string array and state machine
        console.log("--- Starting Pass 4: Inlining String Array ---")
        const inlineStringArr = babel.transformSync(intermediateCode, {
            sourceType: "script",
            plugins: [inlineStringArray],
            code: true
        });
    
        if (!inlineStringArr || !inlineStringArr.code) {
            throw new Error("Pass 4 (Inlining String Array) failed to produce code.");
        }
        intermediateCode = inlineStringArr.code;
        fs.writeFileSync('output.js', intermediateCode, 'utf-8');
        console.log("Pass 4 complete.")
    } catch (err) {
        console.error("\nAn error occurred during deobfuscation:", err);
    }
}

export async function key() {
    const code = fs.readFileSync('output.js', 'utf-8');

    const arrayMatch = code.match(/C\s*=\s*\[([^\]]+)\]/);
    const indexMatch = code.match(/q\s*=\s*\[([^\]]+)\]/);

    if (arrayMatch && indexMatch) {
        const C = arrayMatch[1].split(',').map(s => s.trim().replace(/['"]/g, ''));
        const q = indexMatch[1].split(',').map(s => parseInt(s.trim(), 10));
        const key = q.map(E => C[E]).join('');
        return key;
    }

    const match = code.match(/([a-zA-Z0-9_$]+)\s*=\s*["']([a-fA-F0-9]{64})["']/);
    if (match) {
        const reversed = match[2].split('').reverse().join('');
        return reversed;
    }

    throw new Error("Could not find the key arrays or key assignment in output.js");
}

async function updatekey() {
    const newkey = await key();
    fs.writeFileSync("key.txt", newkey);
}

start();