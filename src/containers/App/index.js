import React, {Component} from 'react';
import {BrowserRouter, Redirect, Route, Switch} from 'react-router-dom';
import LoginPage from '../../components/login/LoginPage'
import AuthorizedComponent from "../../components/login/AuthorizedComponent";
import PrimaryLayout from "../MainPage/PrimaryLayout";

import style from './style.css';

class App extends Component {

    render() {
        return <BrowserRouter>
            <div className={style.App}>
                <Switch>
                    <Route exact path="/auth" component={LoginPage}/>
                    <AuthorizedComponent path="/" component={PrimaryLayout}/>
                    <Redirect to="/auth"/>
                </Switch>
            </div>

        </BrowserRouter>
    }
}

export default App;