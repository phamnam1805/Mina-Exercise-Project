import {
    AccountUpdate,
    fetchAccount,
    Field,
    Group,
    Mina,
    Poseidon,
    PrivateKey,
    Provable,
    PublicKey,
    Scalar,
} from 'o1js';
import { MoveInput, TicTacToe, TicTacToeAction } from './TicTacToe.js';
import inquirer from 'inquirer';

const prompt = inquirer.createPromptModule();

interface Action {
    actions: string[][];
    hash: string;
}

interface TicTacToeState {
    boardHash: string;
    nextPlayer: number;
    moveCounter: number;
    gameCounter: number;
    winner: number;
}

function stringArrayToFields(input: string[]): Field[] {
    const result: Field[] = [];
    for (let i = 0; i < input.length; i++) {
        result.push(Field(input[i]));
    }
    return result;
}

let proofsEnabled = false;

function printBoard(board: Field[]) {
    for (let i = 0; i < 3; i++) {
        console.log(
            board[3 * i + 0].toString(),
            '\t',
            board[3 * i + 1].toString(),
            '\t',
            board[3 * i + 2].toString()
        );
    }
}

async function main() {
    let deployerAccount: Mina.TestPublicKey,
        deployerKey: PrivateKey,
        senderAccount: Mina.TestPublicKey,
        senderKey: PrivateKey,
        zkAppAddress: PublicKey,
        zkAppPrivateKey: PrivateKey,
        zkApp: TicTacToe;
    if (proofsEnabled) await TicTacToe.compile();
    const Local = await Mina.LocalBlockchain({ proofsEnabled });
    Mina.setActiveInstance(Local);
    [deployerAccount, senderAccount] = Local.testAccounts;
    deployerKey = deployerAccount.key;
    senderKey = senderAccount.key;

    zkAppPrivateKey = PrivateKey.random();
    zkAppAddress = zkAppPrivateKey.toPublicKey();
    zkApp = new TicTacToe(zkAppAddress);
    const txn = await Mina.transaction(deployerAccount, async () => {
        AccountUpdate.fundNewAccount(deployerAccount);
        await zkApp.deploy();
    });
    await txn.prove();
    await txn.sign([deployerKey, zkAppPrivateKey]).send();
    while (true) {
        let board = [
            Field(0),
            Field(0),
            Field(0),
            Field(0),
            Field(0),
            Field(0),
            Field(0),
            Field(0),
            Field(0),
        ];
        let winner = Number(zkApp.winner.get().toString());
        let moveCounter = Number(zkApp.moveCounter.get().toString());
        const questions: any[] = [
            {
                type: 'list',
                name: 'number',
                message: 'Choose a number from 0 to 8',
                choices: Array.from({ length: 9 }, (_, i) => i.toString()),
            },
        ];
        while (winner == 3) {
            printBoard(board);
            const nextPlayer = zkApp.nextPlayer.get().toString();
            console.log('Player ', nextPlayer, ' move');
            let success = false;
            while (!success) {
                const moveQuestion: any[] = [
                    {
                        type: 'list',
                        name: 'move',
                        message: 'Choose a number from 0 to 8',
                        choices: Array.from({ length: 9 }, (_, i) =>
                            i.toString()
                        ),
                    },
                ];
                const move = (await inquirer.prompt(moveQuestion)).move;
                try {
                    const txn = await Mina.transaction(
                        senderAccount,
                        async () => {
                            await zkApp.move(
                                new MoveInput({
                                    board: board,
                                    move: Field(move),
                                })
                            );
                        }
                    );
                    await txn.prove();
                    await txn.sign([senderKey]).send();
                    success = true;
                } catch (err) {
                    console.log('Invalid move, please move again');
                }
            }
            const actions = (await Mina.fetchActions(zkAppAddress)) as Action[];
            const ticTacToeAction = TicTacToeAction.fromFields(
                stringArrayToFields(actions[actions.length - 1].actions[0])
            );
            board = ticTacToeAction.board.map((item) => Field(item));
            winner = Number(zkApp.winner.get().toString());
            moveCounter = Number(zkApp.moveCounter.get().toString());
            console.log('');
            if (moveCounter == 9) {
                break;
            }
        }
        if (winner == 3) {
            console.log('Game draw');
            printBoard(board);
        } else {
            console.log('Player ', winner, ' win');
            printBoard(board);
        }

        const continueQuestion: any[] = [
            {
                type: 'confirm',
                name: 'continue',
                message: 'Do you want to play a new game?',
                default: false,
            },
        ];
        const continueAnswer = (await inquirer.prompt(continueQuestion))
            .continue;
        if (!continueAnswer) {
            break;
        } else {
            const txn = await Mina.transaction(senderAccount, async () => {
                await zkApp.newGame();
            });
            await txn.prove();
            await txn.sign([senderKey]).send();
        }
    }
}

main();
