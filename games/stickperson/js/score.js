// Score class handles scoring system and display
// Tracks current score and renders it to the canvas

class Score {
  constructor() {
    this.currentScore = GAME_CONSTANTS.SCORE.INITIAL_SCORE;
  }

  /**
   * Increase the score by a specified amount
   * @param {number} points - Points to add to the score
   */
  addPoints(points = GAME_CONSTANTS.COLLECTIBLES.SCORE_VALUE) {
    this.currentScore += points;
  }

  /**
   * Get the current score
   * @returns {number} Current score value
   */
  getScore() {
    return this.currentScore;
  }

  /**
   * Reset the score to initial value
   */
  reset() {
    this.currentScore = GAME_CONSTANTS.SCORE.INITIAL_SCORE;
  }

  /**
   * Render the score display on the canvas
   * @param {CanvasRenderingContext2D} ctx - Canvas rendering context
   */
  draw(ctx) {
    // Set font and style using constants
    ctx.font = `${GAME_CONSTANTS.SCORE.FONT_SIZE}px ${GAME_CONSTANTS.SCORE.FONT_FAMILY}`;
    ctx.fillStyle = GAME_CONSTANTS.SCORE.COLOR;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    // Create score text
    const scoreText = `${GAME_CONSTANTS.SCORE.PREFIX}${this.currentScore}`;

    // Draw score at specified position
    ctx.fillText(
      scoreText,
      GAME_CONSTANTS.SCORE.POSITION_X,
      GAME_CONSTANTS.SCORE.POSITION_Y
    );
  }
}
