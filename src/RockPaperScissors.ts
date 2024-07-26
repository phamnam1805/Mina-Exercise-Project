import {
    Field,
    SmartContract,
    state,
    State,
    method,
    Struct,
    Group,
    PublicKey,
    Scalar,
    Poseidon,
    Reducer,
    Provable,
    Gadgets,
} from 'o1js';

export class RockPaperScissorsAction extends Struct({
    playerPublicKey: Group,
    encryptedGesture: Field,
    turn: Field,
    game: Field,
}) {}

export class RockPaperScissors extends SmartContract {
    @state(Field) throwCounter = State<Field>();
    @state(Field) gameCounter = State<Field>();
    @state(Field) refereePublicKeyHash = State<Field>();
    @state(Field) playersPublicKeyHash = State<Field>();
    @state(Field) playersEncryptedGestureHash = State<Field>();
    @state(Field) winner = State<Field>();

    reducer = Reducer({ actionType: RockPaperScissorsAction });

    init() {
        super.init();
        this.throwCounter.set(Field(0));
        this.gameCounter.set(Field(0));
        this.playersPublicKeyHash.set(Field(0));
        this.playersEncryptedGestureHash.set(Field(0));
        this.winner.set(Field(3));
    }

    @method async newGame() {
        this.winner.getAndRequireEquals().assertNotEquals(3);
        this.throwCounter.set(Field(0));
        this.gameCounter.set(this.gameCounter.getAndRequireEquals().add(1));
        this.playersPublicKeyHash.set(Field(0));
        this.playersEncryptedGestureHash.set(Field(0));
        this.winner.set(Field(3));
    }

    /* 
        Gesture 
        0 -> Rock
        1 -> Paper
        2 -> Scissors
        1 Win 0
        2 win 1
        0 win 2
    */
    @method async throw(
        refereePublicKey: Group,
        playerPrivateKey: Scalar,
        gesture: Field
    ) {
        this.refereePublicKeyHash
            .getAndRequireEquals()
            .assertEquals(Poseidon.hash(refereePublicKey.toFields()));
        gesture.assertLessThanOrEqual(2);
        gesture.assertGreaterThanOrEqual(0);
        const throwCounter = this.throwCounter.getAndRequireEquals();
        throwCounter.assertLessThan(2);

        const playerPublicKey = Group.generator.scale(playerPrivateKey);
        const playerPublicKeyHash = Poseidon.hash(playerPublicKey.toFields());
        this.playersPublicKeyHash.set(
            Poseidon.hash([
                this.playersPublicKeyHash.getAndRequireEquals(),
                playerPublicKeyHash,
            ])
        );

        const sharedKeyGroup = refereePublicKey.scale(playerPrivateKey);
        const sharedKey = Poseidon.hash(sharedKeyGroup.toFields());
        const encryptedGesture = Gadgets.xor(sharedKey, gesture, 254);
        this.playersEncryptedGestureHash.set(
            Poseidon.hash([
                this.playersEncryptedGestureHash.getAndRequireEquals(),
                encryptedGesture,
            ])
        );

        this.throwCounter.set(throwCounter.add(1));
        this.reducer.dispatch(
            new RockPaperScissorsAction({
                playerPublicKey: playerPublicKey,
                encryptedGesture: encryptedGesture,
                turn: throwCounter.add(1),
                game: this.gameCounter.getAndRequireEquals(),
            })
        );
    }

    /* 
        Gesture 
        0 -> Rock
        1 -> Paper
        2 -> Scissors
        1 Win 0
        2 win 1
        0 win 2
    */
    @method async endGame(
        refereePrivateKey: Scalar,
        firstPlayerPublicKey: Group,
        secondPlayerPublicKey: Group,
        firstPlayerEncryptedGesture: Field,
        secondPlayerEncryptedGesture: Field
    ) {
        let playersPublicKeyHash = Poseidon.hash([
            Field(0),
            Poseidon.hash(firstPlayerPublicKey.toFields()),
        ]);
        playersPublicKeyHash = Poseidon.hash([
            playersPublicKeyHash,
            Poseidon.hash(secondPlayerPublicKey.toFields()),
        ]);
        this.playersPublicKeyHash
            .getAndRequireEquals()
            .assertEquals(playersPublicKeyHash);

        let playersEncryptedGestureHash = Poseidon.hash([
            Field(0),
            firstPlayerEncryptedGesture,
        ]);
        playersEncryptedGestureHash = Poseidon.hash([
            playersEncryptedGestureHash,
            secondPlayerEncryptedGesture,
        ]);
        this.playersEncryptedGestureHash
            .getAndRequireEquals()
            .assertEquals(playersEncryptedGestureHash);

        const refereePublicKey = Group.generator.scale(refereePrivateKey);
        this.refereePublicKeyHash
            .getAndRequireEquals()
            .assertEquals(Poseidon.hash(refereePublicKey.toFields()));

        const firstSharedKeyGroup =
            firstPlayerPublicKey.scale(refereePrivateKey);
        const firstSharedKey = Poseidon.hash(firstSharedKeyGroup.toFields());
        const firstPlayerDecryptedGesture = Gadgets.xor(
            firstSharedKey,
            firstPlayerEncryptedGesture,
            254
        );

        const secondSharedKeyGroup =
            secondPlayerPublicKey.scale(refereePrivateKey);
        const secondSharedKey = Poseidon.hash(secondSharedKeyGroup.toFields());
        const secondPlayerDecryptedGesture = Gadgets.xor(
            secondSharedKey,
            secondPlayerEncryptedGesture,
            254
        );

        /* 
            Gesture 
            0 -> Rock
            1 -> Paper
            2 -> Scissors
            1 Win 0
            2 win 1
            0 win 2
        */

        const winner = Provable.if(
            firstPlayerDecryptedGesture.equals(secondPlayerDecryptedGesture),
            Field(0),
            Provable.if(
                firstPlayerDecryptedGesture
                    .equals(0)
                    .and(secondPlayerDecryptedGesture.equals(2))
                    .or(
                        firstPlayerDecryptedGesture
                            .equals(1)
                            .and(secondPlayerDecryptedGesture.equals(0))
                    )
                    .or(
                        firstPlayerDecryptedGesture
                            .equals(2)
                            .and(secondPlayerDecryptedGesture.equals(1))
                    ),
                Field(1),
                Field(2)
            )
        );
        this.winner.set(winner);
    }
}
