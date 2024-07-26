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

export const WinConditions = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
];

export const WinConditionsLength = WinConditions.length;

export class TicTacToeAction extends Struct({
    board: Provable.Array(Field, 9),
    move: Field,
    game: Field,
}) {}

export class MoveInput extends Struct({
    board: Provable.Array(Field, 9),
    move: Field,
}) {}

export class TicTacToe extends SmartContract {
    @state(Field) boardHash = State<Field>();
    @state(Field) nextPlayer = State<Field>();
    @state(Field) moveCounter = State<Field>();
    @state(Field) gameCounter = State<Field>();
    @state(Field) winner = State<Field>();

    reducer = Reducer({ actionType: TicTacToeAction });

    init() {
        super.init();
        this.boardHash.set(
            Poseidon.hash([
                Field(0),
                Field(0),
                Field(0),
                Field(0),
                Field(0),
                Field(0),
                Field(0),
                Field(0),
                Field(0),
            ])
        );
        this.nextPlayer.set(Field(1));
        this.winner.set(Field(3));
    }

    @method async newGame() {
        this.winner.getAndRequireEquals().assertNotEquals(3);
        this.boardHash.set(
            Poseidon.hash([
                Field(0),
                Field(0),
                Field(0),
                Field(0),
                Field(0),
                Field(0),
                Field(0),
                Field(0),
                Field(0),
            ])
        );
        this.nextPlayer.set(Field(1));
        this.moveCounter.set(Field(0));
        this.winner.set(Field(3));

        const gameCounter = this.gameCounter.getAndRequireEquals().add(1);
        this.gameCounter.set(gameCounter);
    }

    @method async move(input: MoveInput) {
        const winner = this.winner.getAndRequireEquals();
        winner.assertEquals(3);
        const moveCounter = this.moveCounter.getAndRequireEquals().add(1);
        moveCounter.assertLessThanOrEqual(9);
        this.boardHash
            .getAndRequireEquals()
            .assertEquals(Poseidon.hash(input.board));

        const nextPlayer = this.nextPlayer.getAndRequireEquals();
        const nextBoard = input.board;
        for (let i = 0; i < 9; i++) {
            Provable.if(
                input.move.equals(i),
                input.board[i].equals(0),
                Bool(true)
            ).assertTrue();
        }
        for (let i = 0; i < 9; i++) {
            nextBoard[i] = Provable.if(
                input.move.equals(i),
                nextPlayer,
                nextBoard[i]
            );
        }
        const isWin = this.checkWinCondition(nextBoard, nextPlayer);
        this.winner.set(
            Provable.if(
                isWin.equals(Bool(true)),
                nextPlayer,
                Provable.if(moveCounter.equals(9), Field(0), winner)
            )
        );
        this.boardHash.set(Poseidon.hash(nextBoard));
        this.moveCounter.set(moveCounter);
        this.nextPlayer.set(
            Provable.if(nextPlayer.equals(Field(2)), Field(1), Field(2))
        );
        this.reducer.dispatch(
            new TicTacToeAction({
                board: nextBoard,
                move: moveCounter,
                game: this.gameCounter.getAndRequireEquals(),
            })
        );
    }

    checkWinCondition(board: Field[], player: Field): Bool {
        let isWin = Bool(false);
        for (let i = 0; i < WinConditionsLength; i++) {
            const condition = WinConditions[i];
            isWin = isWin.or(
                Field(board[condition[0]])
                    .equals(player)
                    .and(Field(board[condition[1]]).equals(player))
                    .and(Field(board[condition[2]]).equals(player))
            );
        }
        return isWin;
    }
}
