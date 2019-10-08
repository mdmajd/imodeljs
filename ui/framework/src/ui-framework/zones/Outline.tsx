/*---------------------------------------------------------------------------------------------
* Copyright (c) 2019 Bentley Systems, Incorporated. All rights reserved.
* Licensed under the MIT License. See LICENSE.md in the project root for license terms.
*--------------------------------------------------------------------------------------------*/
/** @module Zone */

import * as React from "react";
import { RectangleProps } from "@bentley/ui-core";
import {
  Outline as NZ_Outline,
} from "@bentley/ui-ninezone";

/** @internal */
export interface OutlineProps {
  bounds?: RectangleProps;
}

/** @internal */
export class Outline extends React.PureComponent<OutlineProps> {
  public render(): React.ReactNode {
    if (!this.props.bounds)
      return null;
    return (
      <NZ_Outline bounds={this.props.bounds} />
    );
  }
}