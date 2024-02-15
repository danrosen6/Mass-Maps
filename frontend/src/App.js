import React from "react";
// We use Route in order to define the different routes of our application
import { Route, Routes } from "react-router-dom";

// We import all the components we need in our app
import Navbar from "./components/NavBar/navbar.js";
import HomePage from "./components/pages/homePage";
import Login from "./components/pages/loginPage";
import Signup from "./components/pages/registerPage";
import PrivateUserProfile from "./components/pages/privateUserProfilePage";
import { createContext, useState, useEffect } from "react";
import getUserInfo from "./utilities/decodeJwt";
import LiveMap from "./components/pages/liveMap";

export const UserContext = createContext();
//test change
//test again
const App = () => {
  const [user, setUser] = useState();

  useEffect(() => {
    setUser(getUserInfo());
  }, []);

  return (
    <>
      <Navbar />
      <UserContext.Provider value={user}>
        <Routes>
          <Route exact path="/" element={<Login/>} />
          <Route exact path="/home" element={<HomePage />} />
          <Route exact path="/signup" element={<Signup />} />
          <Route exact path="/privateUserProfile" element={<PrivateUserProfile />} />
          <Route path="/liveMap" element={<LiveMap />} />
        </Routes>
      </UserContext.Provider>
    </>
  );
};



export default App
