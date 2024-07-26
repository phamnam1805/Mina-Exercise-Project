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
    Bool,
} from 'o1js';

export class CoinFlipGuessing extends SmartContract {
    @state(Field) commitment = State<Field>();
    @state(Field) playerAnswer = State<Field>();
    @state(Field) correctAnswer = State<Field>();
    @state(Field) isCoinFlipperWin = State<Field>();

    init() {
        super.init();
        this.commitment.set(Field(0));
        this.playerAnswer.set(Field(2));
        this.isCoinFlipperWin.set(Field(2));
    }

    @method async newGame() {
        this.isCoinFlipperWin.getAndRequireEquals().assertNotEquals(Field(2));

        this.commitment.set(Field(0));
        this.playerAnswer.set(Field(2));
        this.isCoinFlipperWin.set(Field(2));
    }

    @method async flip(nonce: Field, isHeads: Bool) {
        this.isCoinFlipperWin.getAndRequireEquals().assertEquals(Field(2));

        const commitment = Poseidon.hash(
            nonce.toFields().concat(isHeads.toField())
        );
        this.commitment.set(commitment);
    }

    @method async guess(isHeads: Bool) {
        this.isCoinFlipperWin.getAndRequireEquals().assertEquals(Field(2));
        this.commitment.getAndRequireEquals().assertNotEquals(Field(0));

        this.playerAnswer.set(isHeads.toField());
    }

    @method async reveal(nonce: Field, isHeads: Bool) {
        this.isCoinFlipperWin.getAndRequireEquals().assertEquals(Field(2));
        this.playerAnswer.getAndRequireEquals().assertNotEquals(Field(2));

        const commitment = Poseidon.hash(
            nonce.toFields().concat(isHeads.toField())
        );
        this.commitment.getAndRequireEquals().assertEquals(commitment);
        const playerAnswer = this.playerAnswer
            .getAndRequireEquals()
            .equals(Field(1));

        const isCoinFlipperWin = Provable.if(
            playerAnswer.equals(isHeads),
            Bool(true),
            Bool(false)
        );

        this.correctAnswer.set(isHeads.toField());
        this.isCoinFlipperWin.set(isCoinFlipperWin.toField());
    }
}
