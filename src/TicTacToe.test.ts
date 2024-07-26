import {
    AccountUpdate,
    Field,
    Group,
    Mina,
    Poseidon,
    PrivateKey,
    Provable,
    PublicKey,
    Scalar,
} from 'o1js';
import { MoveInput, TicTacToe } from './TicTacToe.js';

interface Action {
    actions: string[][];
    hash: string;
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

describe('Game', () => {
    let deployerAccount: Mina.TestPublicKey,
        deployerKey: PrivateKey,
        senderAccount: Mina.TestPublicKey,
        senderKey: PrivateKey,
        zkAppAddress: PublicKey,
        zkAppPrivateKey: PrivateKey,
        zkApp: TicTacToe;

    beforeAll(async () => {
        if (proofsEnabled) await TicTacToe.compile();
    });

    beforeEach(async () => {
        const Local = await Mina.LocalBlockchain({ proofsEnabled });
        Mina.setActiveInstance(Local);
        [deployerAccount, senderAccount] = Local.testAccounts;
        deployerKey = deployerAccount.key;
        senderKey = senderAccount.key;

        zkAppPrivateKey = PrivateKey.random();
        zkAppAddress = zkAppPrivateKey.toPublicKey();
        zkApp = new TicTacToe(zkAppAddress);
    });

    async function localDeploy() {
        const txn = await Mina.transaction(deployerAccount, async () => {
            AccountUpdate.fundNewAccount(deployerAccount);
            await zkApp.deploy();
        });
        await txn.prove();
        await txn.sign([deployerKey, zkAppPrivateKey]).send();
    }

    it('Fuck', async () => {
        await localDeploy();
        const board = [
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
        printBoard(board);

        let move = 1;
        let nextPlayer = zkApp.nextPlayer.get();
        let txn = await Mina.transaction(senderAccount, async () => {
            await zkApp.move(
                new MoveInput({ board: board, move: Field(move) })
            );
        });
        await txn.prove();
        await txn.sign([senderKey]).send();
        board[move] = nextPlayer;
        console.log('Player ', nextPlayer.toString(), ' move');
        printBoard(board);

        move = 2;
        nextPlayer = zkApp.nextPlayer.get();
        txn = await Mina.transaction(senderAccount, async () => {
            await zkApp.move(
                new MoveInput({ board: board, move: Field(move) })
            );
        });
        await txn.prove();
        await txn.sign([senderKey]).send();
        board[move] = nextPlayer;
        console.log('Player ', nextPlayer.toString(), ' move');
        printBoard(board);

        move = 4;
        nextPlayer = zkApp.nextPlayer.get();
        txn = await Mina.transaction(senderAccount, async () => {
            await zkApp.move(
                new MoveInput({ board: board, move: Field(move) })
            );
        });
        await txn.prove();
        await txn.sign([senderKey]).send();
        board[move] = nextPlayer;
        console.log('Player ', nextPlayer.toString(), ' move');
        printBoard(board);

        move = 3;
        nextPlayer = zkApp.nextPlayer.get();
        txn = await Mina.transaction(senderAccount, async () => {
            await zkApp.move(
                new MoveInput({ board: board, move: Field(move) })
            );
        });
        await txn.prove();
        await txn.sign([senderKey]).send();
        board[move] = nextPlayer;
        console.log('Player ', nextPlayer.toString(), ' move');
        printBoard(board);

        move = 7;
        nextPlayer = zkApp.nextPlayer.get();
        txn = await Mina.transaction(senderAccount, async () => {
            await zkApp.move(
                new MoveInput({ board: board, move: Field(move) })
            );
        });
        await txn.prove();
        await txn.sign([senderKey]).send();
        board[move] = nextPlayer;
        console.log('Player ', nextPlayer.toString(), ' move');
        printBoard(board);

        Provable.log(zkApp.winner.get());
    });
});
