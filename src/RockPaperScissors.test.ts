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
import {
    RockPaperScissors,
    RockPaperScissorsAction,
} from './RockPaperScissors';

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

let proofsEnabled = true;

describe('Game', () => {
    let deployerAccount: Mina.TestPublicKey,
        deployerKey: PrivateKey,
        senderAccount: Mina.TestPublicKey,
        senderKey: PrivateKey,
        zkAppAddress: PublicKey,
        zkAppPrivateKey: PrivateKey,
        zkApp: RockPaperScissors,
        refereePrivateKey: Scalar,
        refereePublicKey: Group,
        refereePublicKeyHash: Field,
        firstPlayerPrivateKey: Scalar,
        firstPlayerPublicKey: Group,
        secondPlayerPrivateKey: Scalar,
        secondPlayerPublicKey: Group;

    beforeAll(async () => {
        if (proofsEnabled) await RockPaperScissors.compile();
    });

    beforeEach(async () => {
        const Local = await Mina.LocalBlockchain({ proofsEnabled });
        Mina.setActiveInstance(Local);
        [deployerAccount, senderAccount] = Local.testAccounts;
        deployerKey = deployerAccount.key;
        senderKey = senderAccount.key;

        zkAppPrivateKey = PrivateKey.random();
        zkAppAddress = zkAppPrivateKey.toPublicKey();
        zkApp = new RockPaperScissors(zkAppAddress);
    });

    async function localDeploy() {
        refereePrivateKey = Scalar.random();
        refereePublicKey = Group.generator.scale(refereePrivateKey);
        refereePublicKeyHash = Poseidon.hash(refereePublicKey.toFields());
        const txn = await Mina.transaction(deployerAccount, async () => {
            AccountUpdate.fundNewAccount(deployerAccount);
            await zkApp.deploy();
            zkApp['refereePublicKeyHash'].set(refereePublicKeyHash);
        });
        await txn.prove();
        await txn.sign([deployerKey, zkAppPrivateKey]).send();
    }

    it('Fuck', async () => {
        await localDeploy();
        firstPlayerPrivateKey = Scalar.random();
        firstPlayerPublicKey = Group.generator.scale(firstPlayerPrivateKey);
        secondPlayerPrivateKey = Scalar.random();
        secondPlayerPublicKey = Group.generator.scale(secondPlayerPrivateKey);

        /* 
            Gesture 
            0 -> Rock
            1 -> Paper
            2 -> Scissors
            1 Win 0
            2 win 1
            0 win 2
        */
        const txn1 = await Mina.transaction(senderAccount, async () => {
            await zkApp.throw(
                refereePublicKey,
                firstPlayerPrivateKey,
                Field(0)
            );
        });
        await txn1.prove();
        await txn1.sign([senderKey]).send();

        const txn2 = await Mina.transaction(senderAccount, async () => {
            await zkApp.throw(
                refereePublicKey,
                secondPlayerPrivateKey,
                Field(2)
            );
        });
        await txn2.prove();
        await txn2.sign([senderKey]).send();

        const actions = (await Mina.fetchActions(zkAppAddress)) as Action[];
        const firstPlayerEncryptedGesture = RockPaperScissorsAction.fromFields(
            stringArrayToFields(actions[0].actions[0])
        ).encryptedGesture;
        const secondPlayerEncryptedGesture = RockPaperScissorsAction.fromFields(
            stringArrayToFields(actions[1].actions[0])
        ).encryptedGesture;

        const txn3 = await Mina.transaction(senderAccount, async () => {
            await zkApp.endGame(
                refereePrivateKey,
                firstPlayerPublicKey,
                secondPlayerPublicKey,
                firstPlayerEncryptedGesture,
                secondPlayerEncryptedGesture
            );
        });
        await txn3.prove();
        await txn3.sign([senderKey]).send();
        Provable.log('Player ', zkApp.winner.get(), ' is the Winner');
    });
});
