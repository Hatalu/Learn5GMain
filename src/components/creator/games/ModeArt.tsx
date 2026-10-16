'use client';

import './games.css';
import React from 'react';
import type { GameMode } from '@/lib/game-creator/modes';
import { Avatar } from '../Avatar';
import { ChoiceShape, choiceStyle } from '../ChoiceShape';
import { Coin, Flag, Food } from './art';
import { TowerIcon } from './TowerGame';

/** ภาพหน้าปกของแต่ละรูปแบบการเล่น */
export function ModeArt({ mode }: { mode: GameMode }) {
  if (mode === 'quiz') {
    return (
      <div className="ma ma-quiz">
        <div className="ma-quiz-q">
          <svg viewBox="0 0 40 30" width="40" height="30" aria-hidden="true">
            <text x="4" y="12" fontSize="11" fontWeight="700" fill="#2a2350">3</text>
            <line x1="2" y1="15" x2="14" y2="15" stroke="#2a2350" strokeWidth="2" />
            <text x="4" y="27" fontSize="11" fontWeight="700" fill="#2a2350">4</text>
            <text x="19" y="21" fontSize="12" fontWeight="700" fill="#2a2350">= ?</text>
          </svg>
        </div>
        <div className="ma-quiz-grid">
          {[0, 1, 2, 3].map((i) => (
            <span key={i} style={{ background: choiceStyle(i).color, animationDelay: `${i * 0.15}s` }}>
              <ChoiceShape i={i} size={16} />
            </span>
          ))}
        </div>
      </div>
    );
  }
  if (mode === 'cafe') {
    return (
      <div className="ma ma-cafe">
        <span className="ma-awning" />
        <div className="ma-cafe-row">
          <span className="ma-bob" style={{ animationDelay: '0s' }}>
            <Avatar id={1} size={46} />
          </span>
          <span className="ma-bubble">
            <Food id="cake" size={22} />
          </span>
          <span className="ma-bob" style={{ animationDelay: '-.7s' }}>
            <Avatar id={4} size={46} />
          </span>
        </div>
        <div className="ma-counter">
          <Food id="bread" size={22} />
          <Food id="milk" size={22} />
          <Food id="donut" size={22} />
          <Coin size={20} />
        </div>
      </div>
    );
  }
  if (mode === 'tower') {
    return (
      <div className="ma ma-tower">
        <span className="ma-path" />
        <span className="ma-t1">
          <TowerIcon kind="owl" size={40} />
        </span>
        <span className="ma-t2">
          <TowerIcon kind="dragon" size={40} />
        </span>
        <span className="ma-t3">
          <TowerIcon kind="squirrel" size={36} />
        </span>
        {[0, 1, 2].map((i) => (
          <span key={i} className="ma-slime" style={{ animationDelay: `${-i * 1.2}s`, ['--sc' as string]: ['#7ddc86', '#5ccbff', '#ff8fc4'][i] }} />
        ))}
      </div>
    );
  }
  return (
    <div className="ma ma-race">
      {[0, 1, 2].map((i) => (
        <div key={i} className="ma-lane">
          <span className="ma-runner" style={{ animationDelay: `${-i * 0.9}s`, animationDuration: `${3.2 + i * 0.5}s` }}>
            <Avatar id={[0, 7, 3][i]} size={30} />
          </span>
        </div>
      ))}
      <span className="ma-flag">
        <Flag size={22} />
      </span>
    </div>
  );
}
